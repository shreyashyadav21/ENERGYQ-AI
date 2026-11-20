import { useEnergyStore } from '../stores/energyStore';
import { GridIncident, TelemetryPayload } from '../types/energy';
import { getAccessToken } from './supabase';

class EnergyWebSocketService {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private isExplicitClose = false;
  private backendHttpUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
  private backendWsUrl = `${this.backendHttpUrl.replace(/^http/, 'ws')}/ws/telemetry`;

  private async authHeaders(): Promise<Record<string, string>> {
    const user = useEnergyStore.getState().user;
    if (!user) throw new Error('You must sign in before sending commands.');
    if (user.id.startsWith('usr_')) return { 'X-EnergyQ-Demo-Role': user.role };
    const token = await getAccessToken();
    if (!token) throw new Error('Your authenticated session has expired. Please sign in again.');
    return { Authorization: `Bearer ${token}` };
  }

  public connect() {
    this.isExplicitClose = false;

    try {
      this.socket = new WebSocket(this.backendWsUrl);

      this.socket.onopen = () => {
        console.log('[EnergyQ WS] Connected to backend telemetry stream');
        void this.authorizeSocket();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.smart_home && data.transformers) {
            useEnergyStore.getState().setTelemetry(data as TelemetryPayload);
            useEnergyStore.getState().setIsConnected(true);
          }
        } catch (err) {
          console.error('[EnergyQ WS] Error parsing telemetry payload:', err);
        }
      };

      this.socket.onclose = () => {
        useEnergyStore.getState().setIsConnected(false);
        if (!this.isExplicitClose) {
          console.log('[EnergyQ WS] Connection lost. Reconnecting in 2.5s...');
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (err) => {
        console.warn('[EnergyQ WS] Socket encountered error:', err);
      };
    } catch (err) {
      console.warn('[EnergyQ WS] Connection failed, retrying in 3s:', err);
      this.scheduleReconnect();
    }
  }

  private async authorizeSocket() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    try {
      const user = useEnergyStore.getState().user;
      if (!user) throw new Error('No signed-in user for telemetry connection.');
      const accessToken = user.id.startsWith('usr_') ? null : await getAccessToken();
      if (!user.id.startsWith('usr_') && !accessToken) throw new Error('Authenticated session has expired.');
      this.socket.send(JSON.stringify({
        action: 'AUTH',
        access_token: accessToken,
        demo_role: accessToken ? undefined : user.role,
      }));
    } catch (error) {
      console.error('[EnergyQ WS] Could not authenticate telemetry connection:', error);
      this.socket.close();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, 2500);
  }

  public disconnect() {
    this.isExplicitClose = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public toggleAppliance(applianceId: string, state: boolean) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        action: 'TOGGLE_APPLIANCE',
        appliance_id: applianceId,
        state: state
      }));
    } else {
      void this.post('/api/appliances/toggle', { appliance_id: applianceId, state }).catch((error) => console.error('Appliance command failed:', error));
    }
  }

  public triggerEvent(eventType: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        action: 'TRIGGER_EVENT',
        event_type: eventType
      }));
    } else {
      void this.post('/api/events/trigger', { event_type: eventType }).catch((error) => console.error('Grid event command failed:', error));
    }
  }

  public toggleScenario(scenario: string) {
    this.triggerEvent(scenario);
  }

  public assignCrew(transformerId: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        action: 'ASSIGN_CREW',
        transformer_id: transformerId
      }));
    } else {
      void this.post('/api/maintenance/action', { transformer_id: transformerId, action: 'assign_crew' }).catch((error) => console.error('Crew dispatch failed:', error));
    }
  }

  public markResolved(transformerId: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        action: 'MARK_RESOLVED',
        transformer_id: transformerId
      }));
    } else {
      void this.post('/api/maintenance/action', { transformer_id: transformerId, action: 'mark_resolved' }).catch((error) => console.error('Incident resolution failed:', error));
    }
  }

  private async post(path: string, body: unknown) {
    const headers = await this.authHeaders();
    const response = await fetch(`${this.backendHttpUrl}${path}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Request failed (${response.status}): ${details}`);
    }
    return response.json();
  }

  public async submitIncident(input: { category: string; description: string; locality: string }): Promise<GridIncident> {
    const headers = await this.authHeaders();
    const response = await fetch(`${this.backendHttpUrl}/api/incidents`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`Incident could not be submitted (${response.status}).`);
    return response.json();
  }

  public async createIncident(input: { category: string; description: string; locality: string }): Promise<GridIncident> {
    return this.submitIncident(input);
  }

  public async listIncidents(): Promise<GridIncident[]> {
    const headers = await this.authHeaders();
    const response = await fetch(`${this.backendHttpUrl}/api/incidents`, { headers });
    if (!response.ok) throw new Error(`Incident queue could not be loaded (${response.status}).`);
    return response.json();
  }

  public async listMyIncidents(): Promise<GridIncident[]> {
    const headers = await this.authHeaders();
    const response = await fetch(`${this.backendHttpUrl}/api/incidents/mine`, { headers });
    if (!response.ok) throw new Error(`Your reports could not be loaded (${response.status}).`);
    return response.json();
  }

  public async respondToIncident(id: string, responseText: string, status: 'responded' | 'resolved'): Promise<GridIncident> {
    const headers = await this.authHeaders();
    const response = await fetch(`${this.backendHttpUrl}/api/incidents/${encodeURIComponent(id)}/response`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: responseText, status }),
    });
    if (!response.ok) throw new Error(`Reply could not be sent (${response.status}).`);
    return response.json();
  }

  public async queryVoice(query: string, language: string = 'en') {
    try {
      const headers = await this.authHeaders();
      const res = await fetch(`${this.backendHttpUrl}/api/voice`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, language })
      });
      if (!res.ok) throw new Error(`Voice request failed (${res.status}).`);
      return await res.json();
    } catch (e) {
      console.error('Voice API request failed:', e);
      throw e;
    }
  }

  /** Send recorded audio blob to Sarvam AI STT endpoint */
  public async queryVoiceSTT(audioBlob: Blob, language: string = 'en-IN'): Promise<{ transcript: string; language: string; source: string }> {
    try {
      const form = new FormData();
      form.append('file', audioBlob, 'recording.webm');
      form.append('language', language);
      const headers = await this.authHeaders();
      const res = await fetch(`${this.backendHttpUrl}/api/voice/stt`, {
        method: 'POST',
        headers,
        body: form
      });
      if (!res.ok) throw new Error(`Speech transcription failed (${res.status}).`);
      const result = await res.json();
      return { transcript: result.text || '', language: result.language || language, source: result.source || 'api' };
    } catch (e) {
      console.error('STT API request failed:', e);
      throw e;
    }
  }

  /** Send transcribed text to voice chat endpoint for NLU + live telemetry response */
  public async queryVoiceChat(text: string, language: string = 'en-IN'): Promise<{
    response_text: string;
    intent: string;
    action_executed?: string;
    transformer_id?: string;
  }> {
    try {
      const headers = await this.authHeaders();
      const res = await fetch(`${this.backendHttpUrl}/api/voice/chat`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, language })
      });
      if (!res.ok) throw new Error(`Voice chat failed (${res.status}).`);
      return await res.json();
    } catch (e) {
      console.error('Voice chat request failed:', e);
      throw e;
    }
  }

  /** Convert text to Sarvam AI TTS audio and return audio URL or base64 */
  public async queryVoiceTTS(text: string, language: string = 'en-IN'): Promise<{ audio_base64?: string; source: string }> {
    try {
      const headers = await this.authHeaders();
      const res = await fetch(`${this.backendHttpUrl}/api/voice/tts`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language })
      });
      if (!res.ok) throw new Error(`Speech synthesis failed (${res.status}).`);
      return await res.json();
    } catch (e) {
      console.warn('TTS API error:', e);
      return { source: 'error' };
    }
  }
}

export const energyWs = new EnergyWebSocketService();
