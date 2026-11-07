class AirQualityCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._initialized = false;
  }

  setConfig(config) {
    this._config = {
      uaqi_entity: 'sensor.home_universal_air_quality_index',
      uaqi_category_entity: 'sensor.home_uaqi_category',
      uaqi_pollutant_entity: 'sensor.home_uaqi_dominant_pollutant',
      aqhi_entity: 'sensor.home_aqhi_ca_aqi',
      aqhi_category_entity: 'sensor.home_aqhi_ca_category',
      aqhi_pollutant_entity: 'sensor.home_aqhi_ca_dominant_pollutant',
      ...config,
    };
    if (this._initialized) {
      this._update();
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._renderSkeleton();
      this._initialized = true;
    }
    this._update();
  }

  getCardSize() {
    return 2;
  }

  getGridOptions() {
    return {
      columns: 12,
      min_columns: 6,
      rows: 'auto',
    };
  }

  _openMoreInfo(entityId) {
    if (!entityId) return;
    const event = new CustomEvent('hass-more-info', {
      detail: { entityId },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  _getUaqiInfo(score) {
    if (score >= 80) return { label: 'Excellent', color: '#34d399' };
    if (score >= 60) return { label: 'Good', color: '#2dd4bf' };
    if (score >= 40) return { label: 'Moderate', color: '#fbbf24' };
    if (score >= 20) return { label: 'Low', color: '#fb923c' };
    return { label: 'Poor', color: '#ff453a' };
  }

  _getAqhiInfo(val) {
    if (val <= 3) return { label: 'Low Risk', color: '#38bdf8' };
    if (val <= 6) return { label: 'Moderate', color: '#fbbf24' };
    if (val <= 10) return { label: 'High Risk', color: '#ff453a' };
    return { label: 'Very High', color: '#c084fc' };
  }

  _formatPollutant(raw) {
    if (!raw) return '--';
    const key = String(raw).toLowerCase().trim();
    const map = {
      o3: 'O₃',
      no2: 'NO₂',
      pm25: 'PM₂.₅',
      pm2_5: 'PM₂.₅',
      pm10: 'PM₁₀',
      co: 'CO',
      so2: 'SO₂',
    };
    return map[key] || key.toUpperCase();
  }

  _renderSkeleton() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --uaqi-color: #34d399;
          --aqhi-color: #38bdf8;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .tile {
          position: relative;
          background: var(--ha-card-background, var(--card-background-color, #1c1c1e));
          border-radius: var(--ha-card-border-radius, 16px);
          padding: 13px 14px 13px 14px;
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.2s ease;
          box-sizing: border-box;
          overflow: hidden;
        }
        .tile.uaqi {
          border: 1px solid color-mix(in srgb, var(--uaqi-color) 32%, rgba(255, 255, 255, 0.08));
        }
        .tile.aqhi {
          border: 1px solid color-mix(in srgb, var(--aqhi-color) 32%, rgba(255, 255, 255, 0.08));
        }
        .tile:hover {
          transform: translateY(-1px);
        }
        .top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          margin-bottom: 6px;
        }
        .label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(255, 255, 255, 0.6);
          white-space: nowrap;
        }
        .tile.uaqi .label { color: var(--uaqi-color); }
        .tile.aqhi .label { color: var(--aqhi-color); }
        .pill {
          font-size: 10px;
          font-weight: 700;
          padding: 1.5px 7px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.75);
          white-space: nowrap;
        }
        .val-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 6px;
          margin-bottom: 10px;
        }
        .num-group {
          display: flex;
          align-items: baseline;
          gap: 3px;
        }
        .val {
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.1;
          letter-spacing: -0.5px;
        }
        .max {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.45);
        }
        .status {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.82);
          white-space: nowrap;
        }
        .bar-track {
          position: relative;
          height: 5px;
          border-radius: 999px;
          width: 100%;
        }
        .bar-track.uaqi-track {
          background: linear-gradient(90deg, #ff453a 0%, #fb923c 28%, #fbbf24 52%, #38bdf8 76%, #34d399 100%);
        }
        .bar-track.aqhi-track {
          background: linear-gradient(90deg, #38bdf8 0%, #34d399 28%, #fbbf24 55%, #ff453a 85%, #c084fc 100%);
        }
        .bar-dot {
          position: absolute;
          top: 50%;
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: #ffffff;
          border: 2.5px solid #1c1c1e;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
          transition: left 0.4s ease;
        }
      </style>
      <div class="grid">
        <div class="tile uaqi" id="uaqi-click" title="Universal Air Quality Index">
          <div class="top-row">
            <span class="label">Universal AQI</span>
            <span class="pill" id="uaqi-poll">O₃</span>
          </div>
          <div class="val-row">
            <div class="num-group">
              <span class="val" id="uaqi-val">--</span>
              <span class="max">/ 100</span>
            </div>
            <span class="status" id="uaqi-status">--</span>
          </div>
          <div class="bar-track uaqi-track">
            <div class="bar-dot" id="uaqi-dot" style="left: 0%"></div>
          </div>
        </div>

        <div class="tile aqhi" id="aqhi-click" title="Canada Air Quality Health Index">
          <div class="top-row">
            <span class="label">Health Risk</span>
            <span class="pill" id="aqhi-poll">NO₂</span>
          </div>
          <div class="val-row">
            <div class="num-group">
              <span class="val" id="aqhi-val">--</span>
              <span class="max">/ 10</span>
            </div>
            <span class="status" id="aqhi-status">--</span>
          </div>
          <div class="bar-track aqhi-track">
            <div class="bar-dot" id="aqhi-dot" style="left: 0%"></div>
          </div>
        </div>
      </div>
    `;

    this.shadowRoot.getElementById('uaqi-click').addEventListener('click', () => {
      this._openMoreInfo(this._config.uaqi_entity);
    });
    this.shadowRoot.getElementById('aqhi-click').addEventListener('click', () => {
      this._openMoreInfo(this._config.aqhi_entity);
    });
  }

  _update() {
    if (!this._hass || !this._config || !this._initialized) return;

    const uaqiState = this._hass.states[this._config.uaqi_entity];
    const uaqiPollState = this._hass.states[this._config.uaqi_pollutant_entity];
    const aqhiState = this._hass.states[this._config.aqhi_entity];
    const aqhiPollState = this._hass.states[this._config.aqhi_pollutant_entity];

    const rawUaqi = uaqiState ? parseFloat(uaqiState.state) : 0;
    const uaqi = Number.isFinite(rawUaqi) ? Math.max(0, Math.min(100, rawUaqi)) : 0;

    const rawAqhi = aqhiState ? parseFloat(aqhiState.state) : 1;
    const aqhi = Number.isFinite(rawAqhi) ? Math.max(1, rawAqhi) : 1;

    const uaqiInfo = this._getUaqiInfo(uaqi);
    const aqhiInfo = this._getAqhiInfo(aqhi);

    this.style.setProperty('--uaqi-color', uaqiInfo.color);
    this.style.setProperty('--aqhi-color', aqhiInfo.color);

    const root = this.shadowRoot;
    root.getElementById('uaqi-val').textContent = Math.round(uaqi);
    root.getElementById('uaqi-status').textContent = uaqiInfo.label;
    root.getElementById('uaqi-poll').textContent = this._formatPollutant(uaqiPollState ? uaqiPollState.state : '');
    root.getElementById('uaqi-dot').style.left = `${Math.max(3, Math.min(97, uaqi))}%`;

    root.getElementById('aqhi-val').textContent = aqhi % 1 === 0 ? Math.round(aqhi) : aqhi.toFixed(1);
    root.getElementById('aqhi-status').textContent = aqhiInfo.label;
    root.getElementById('aqhi-poll').textContent = this._formatPollutant(aqhiPollState ? aqhiPollState.state : '');
    const aqhiPct = ((Math.min(10, Math.max(1, aqhi)) - 1) / 9) * 100;
    root.getElementById('aqhi-dot').style.left = `${Math.max(4, Math.min(96, aqhiPct))}%`;
  }
}

if (!customElements.get('air-quality-card')) {
  customElements.define('air-quality-card', AirQualityCard);
}
window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === 'air-quality-card')) {
  window.customCards.push({
    type: 'air-quality-card',
    name: 'Air Quality & Health Card',
    description: 'Minimalist Universal AQI & Canada AQHI card',
  });
}
