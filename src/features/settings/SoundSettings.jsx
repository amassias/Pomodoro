const SoundSettings = ({ settings, onChange }) => (
    <div className="setting-group">
        <h3>Sound</h3>

        <div className="sound-section">
            <label>Alarm sound</label>
            <select
                name="sound"
                value={settings.sound || 'bell'}
                onChange={onChange}
                className="sound-select"
            >
                <option value="beep">Digital Beep</option>
                <option value="bell">Bell</option>
                <option value="alarm">Classic Alarm</option>
                <option value="lofi-hum">Soft Hum</option>
                <option value="chime">Chime</option>
                <option value="soft-bell">Soft Bell</option>
                <option value="kitchen-timer">Kitchen Timer</option>
                <option value="phone-ring">Phone Ring</option>
            </select>

            <div className="slider-group">
                <label>Volume</label>
                <input
                    type="range"
                    name="alarmVolume"
                    value={settings.alarmVolume ?? 70}
                    onChange={onChange}
                    min="0"
                    max="100"
                    className="slider"
                />
                <span className="slider-value">{settings.alarmVolume ?? 70}</span>
            </div>

            <div className="slider-group">
                <label>Repeat</label>
                <input
                    type="number"
                    name="alarmRepeat"
                    value={settings.alarmRepeat || 1}
                    onChange={onChange}
                    min="1"
                    max="10"
                    className="repeat-input"
                />
            </div>
        </div>

        <div className="sound-section">
            <label>Ticking sound</label>
            <select
                name="tickingSound"
                value={settings.tickingSound || 'none'}
                onChange={onChange}
                className="sound-select"
            >
                <option value="none">None</option>
                <option value="soft">Soft Tick</option>
                <option value="regular">Regular Tick</option>
                <option value="loud">Loud Tick</option>
                <option value="tick">Wood Tap</option>
                <option value="type-click">Typewriter</option>
                <option value="soft-pop">Soft Pop</option>
            </select>

            <div className="slider-group">
                <label>Volume</label>
                <input
                    type="range"
                    name="tickingVolume"
                    value={settings.tickingVolume ?? 50}
                    onChange={onChange}
                    min="0"
                    max="100"
                    className="slider"
                />
                <span className="slider-value">{settings.tickingVolume ?? 50}</span>
            </div>
        </div>
    </div>
);

export default SoundSettings;
