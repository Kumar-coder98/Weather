// Your weather API key - Replace with your actual key if different
const API_KEY = 'aa0ae27e321c7b189650522b6a20cba1';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Helper function to fetch JSON from a URL
async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`HTTP error! Status: ${res.status}, Message: ${errorData.message || res.statusText}`);
    }
    return await res.json();
}

// Function to get current weather data by coordinates
async function getCurrentWeather(lat, lon) {
    const url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const data = await fetchJSON(url);
    return {
        name: data.name,
        country: data.sys.country,
        temp: data.main.temp,
        feels_like: data.main.feels_like,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        visibility: data.visibility,
        wind_speed: data.wind.speed,
        wind_deg: data.wind.deg,
        description: data.weather[0].description,
        main: data.weather[0].main,
        icon: data.weather[0].icon,
        sunrise: data.sys.sunrise,
        sunset: data.sys.sunset,
        coord: data.coord,
        timezone: data.timezone,
    };
}

// Function to get weather data by city name
async function getWeatherByCity(city) {
    document.body.style.backgroundAttachment = 'fixed';
    const url = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    const data = await fetchJSON(url);
    return {
        name: data.name,
        country: data.sys.country,
        temp: data.main.temp,
        feels_like: data.main.feels_like,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        visibility: data.visibility,
        wind_speed: data.wind.speed,
        wind_deg: data.wind.deg,
        description: data.weather[0].description,
        main: data.weather[0].main,
        icon: data.weather[0].icon,
        sunrise: data.sys.sunrise,
        sunset: data.sys.sunset,
        coord: data.coord,
        timezone: data.timezone,
    };
}

// Global variables for forecast data and timezone
let fullForecastData = {}; // Stores grouped 3-hour forecast data
window.fullHourlyList = []; // Stores raw list of all 3-hour forecasts
window.timezoneOffset = 0; // Stores timezone offset from UTC in seconds

// Function to get 5-day / 3-hour forecast data
async function getForecast(lat, lon) {
    const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const data = await fetchJSON(url);
    window.fullHourlyList = data.list;
    window.timezoneOffset = data.city.timezone || 0;

    const dailySummaries = {};
    const detailedForecastByDay = {};

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const currentDate = new Date(currentTimestamp * 1000);
    const currentDay = currentDate.toISOString().split('T')[0];

    data.list.forEach(item => {
        const dateKey = item.dt_txt.split(" ")[0];

        if (!detailedForecastByDay[dateKey]) {
            detailedForecastByDay[dateKey] = [];
        }
        detailedForecastByDay[dateKey].push(item);

        if (!dailySummaries[dateKey]) {
            dailySummaries[dateKey] = {
                date: item.dt_txt,
                temp_max: item.main.temp_max,
                temp_min: item.main.temp_min,
                description: item.weather[0].description,
                main: item.weather[0].main,
                icon: item.weather[0].icon,
            };
        } else {
            dailySummaries[dateKey].temp_max = Math.max(dailySummaries[dateKey].temp_max, item.main.temp_max);
            dailySummaries[dateKey].temp_min = Math.min(dailySummaries[dateKey].temp_min, item.main.temp_min);
        }
    });

    fullForecastData = detailedForecastByDay;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = tomorrow.toISOString().split('T')[0];

    const summarizedForecast = Object.values(dailySummaries)
        .filter(day => day.date.split(' ')[0] >= tomorrowKey)
        .slice(0, 5);

    return { todayForecast: detailedForecastByDay[currentDay] || [], summarizedForecast };
}
// Function to get current geolocation
async function getCurrentLocation() {
    document.body.style.backgroundAttachment = 'fixed';

    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser.'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                try {
                    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
                    const data = await res.json();
                    const locationName = data.city || data.locality || data.principalSubdivision || 'Unknown location';
                    resolve({ lat, lon });
                } catch (err) {
                    reject(new Error('Failed to fetch location name.'));
                }
            },
            (error) => {
                const messages = {
                    1: 'Location access denied.',
                    2: 'Location unavailable.',
                    3: 'Location request timed out.',
                };
                reject(new Error(messages[error.code] || 'Unknown location error.'));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    });
}


// UI Elements - Ensure these IDs match your HTML
const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const locationBtn = document.getElementById('location-btn');
const loadingDiv = document.getElementById('loading');
const weatherContainer = document.getElementById('weather-container');
const weatherCard = document.getElementById('weather-card');
const forecastCard = document.getElementById('forecast-card');
const weatherDetails = document.getElementById('weather-details');
const toastContainer = document.getElementById('toast-container');
const hourlyWeatherContainer = document.getElementById('hourly-weather-container'); // Added this reference

// Modal elements
const hourlyForecastModal = document.getElementById('hourly-forecast-modal');
const hourlyForecastTitle = document.getElementById('hourly-forecast-title');
const hourlyForecastGrid = document.getElementById('hourly-forecast-grid');
const modalCloseBtn = document.querySelector('.modal-close-btn');

// State variable
let currentCoordinates = null;

// Background images mapping OpenWeatherMap icons to high-quality GIF links
const weatherGifs = {
    "01d": "clearsky.jpg", // Clear Day
    "01n": "clearnight.jpg", // Clear Night
    "02d": "fewcloudsday.jpg", // Few Clouds Day
    "02n": "fewcloudsnight.jpg", // Few Clouds Night
    "03d": "scatteredclouds.jpg", // Scattered Clouds
    "03n": "scatteredclouds.jpg",
    "04d": "brokenclouds.jpg", // Broken Clouds
    "04n": "brokenclouds.jpg",
    "09d": "rain.png", // Shower Rain
    "09n": "rain.png",
    "10d": "rain.png", // Rain
    "10n": "rain.png",
    "11d": "thunderstrom.jpg", // Thunderstorm
    "11n": "thunderstrom.jpg",
    "13d": "snow.jpg", // Snow
    "13n": "snow.jpg",
    "50d": "mist.jpg", // Mist/Fog
    "50n": "mist.jpg"
};

// Mapping of 2-letter country codes to full country names
const countryNames = {
    "AD": "Andorra", "AE": "United Arab Emirates", "AF": "Afghanistan", "AG": "Antigua and Barbuda",
    "AI": "Anguilla", "AL": "Albania", "AM": "Armenia", "AO": "Angola", "AQ": "Antarctica",
    "AR": "Argentina", "AS": "American Samoa", "AT": "Austria", "AU": "Australia", "AW": "Aruba",
    "AX": "Åland Islands", "AZ": "Azerbaijan", "BA": "Bosnia and Herzegovina", "BB": "Barbados",
    "BD": "Bangladesh", "BE": "Belgium", "BF": "Burkina Faso", "BG": "Bulgaria", "BH": "Bahrain",
    "BI": "Burundi", "BJ": "Benin", "BL": "Saint Barthélemy", "BM": "Bermuda", "BN": "Brunei Darussalam",
    "BO": "Bolivia (Plurinational State of)", "BQ": "Bonaire, Sint Eustatius and Saba", "BR": "Brazil",
    "BS": "Bahamas", "BT": "Bhutan", "BV": "Bouvet Island", "BW": "Botswana", "BY": "Belarus",
    "BZ": "Belize", "CA": "Canada", "CC": "Cocos (Keeling) Islands", "CD": "Congo, Democratic Republic of the",
    "CF": "Central African Republic", "CG": "Congo", "CH": "Switzerland", "CI": "Côte d'Ivoire",
    "CK": "Cook Islands", "CL": "Chile", "CM": "Cameroon", "CN": "China", "CO": "Colombia",
    "CR": "Costa Rica", "CU": "Cuba", "CV": "Cabo Verde", "CW": "Curaçao", "CX": "Christmas Island",
    "CY": "Cyprus", "CZ": "Czechia", "DE": "Germany", "DJ": "Djibouti", "DK": "Denmark",
    "DM": "Dominica", "DO": "Dominican Republic", "DZ": "Algeria", "EC": "Ecuador", "EE": "Estonia",
    "EG": "Egypt", "EH": "Western Sahara", "ER": "Eritrea", "ES": "Spain", "ET": "Ethiopia",
    "FI": "Finland", "FJ": "Fiji", "FK": "Falkland Islands (Malvinas)", "FM": "Micronesia (Federated States of)",
    "FO": "Faroe Islands", "FR": "France", "GA": "Gabon", "GB": "United Kingdom", "GD": "Grenada",
    "GE": "Georgia", "GF": "French Guiana", "GG": "Guernsey", "GH": "Ghana", "GI": "Gibraltar",
    "GL": "Greenland", "GM": "Gambia", "GN": "Guinea", "GP": "Guadeloupe", "GQ": "Equatorial Guinea",
    "GR": "Greece", "GS": "South Georgia and the South Sandwich Islands", "GT": "Guatemala",
    "GU": "Guam", "GW": "Guinea-Bissau", "GY": "Guyana", "HK": "Hong Kong", "HM": "Heard Island and McDonald Islands",
    "HN": "Honduras", "HR": "Croatia", "HT": "Haiti", "HU": "Hungary", "ID": "Indonesia",
    "IE": "Ireland", "IL": "Israel", "IM": "Isle of Man", "IN": "India", "IO": "British Indian Ocean Territory",
    "IQ": "Iraq", "IR": "Iran (Islamic Republic of)", "IS": "Iceland", "IT": "Italy", "JE": "Jersey",
    "JM": "Jamaica", "JO": "Jordan", "JP": "Japan", "KE": "Kenya", "KG": "Kyrgyzstan",
    "KH": "Cambodia", "KI": "Kiribati", "KM": "Comoros", "KN": "Saint Kitts and Nevis", "KP": "Korea (Democratic People's Republic of)",
    "KR": "Korea, Republic of", "KW": "Kuwait", "KY": "Cayman Islands", "KZ": "Kazakhstan", "LA": "Lao People's Democratic Republic",
    "LB": "Lebanon", "LC": "Saint Lucia", "LI": "Liechtenstein", "LK": "Sri Lanka", "LR": "Liberia",
    "LS": "Lesotho", "LT": "Lithuania", "LU": "Luxembourg", "LV": "Latvia", "LY": "Libya",
    "MA": "Morocco", "MC": "Monaco", "MD": "Moldova, Republic of", "ME": "Montenegro", "MF": "Saint Martin (French part)",
    "MG": "Madagascar", "MH": "Marshall Islands", "MK": "North Macedonia", "ML": "Mali", "MM": "Myanmar",
    "MN": "Mongolia", "MO": "Macao", "MP": "Northern Mariana Islands", "MQ": "Martinique", "MR": "Mauritania",
    "MS": "Montserrat", "MT": "Malta", "MU": "Mauritius", "MV": "Maldives", "MW": "Malawi",
    "MX": "Mexico", "MY": "Malaysia", "MZ": "Mozambique", "NA": "Namibia", "NC": "New Caledonia",
    "NE": "Niger", "NF": "Norfolk Island", "NG": "Nigeria", "NI": "Nicaragua", "NL": "Netherlands",
    "NO": "Norway", "NP": "Nepal", "NR": "Nauru", "NU": "Niue", "NZ": "New Zealand",
    "OM": "Oman", "PA": "Panama", "PE": "Peru", "PF": "French Polynesia", "PG": "Papua New Guinea",
    "PH": "Philippines", "PK": "Pakistan", "PL": "Poland", "PM": "Saint Pierre and Miquelon", "PN": "Pitcairn",
    "PR": "Puerto Rico", "PS": "Palestine, State of", "PT": "Portugal", "PW": "Palau", "PY": "Paraguay",
    "QA": "Qatar", "RE": "Réunion", "RO": "Romania", "RS": "Serbia", "RU": "Russian Federation",
    "RW": "Rwanda", "SA": "Saudi Arabia", "SB": "Solomon Islands", "SC": "Seychelles", "SD": "Sudan",
    "SE": "Sweden", "SG": "Singapore", "SH": "Saint Helena, Ascension and Tristan da Cunha", "SI": "Slovenia",
    "SJ": "Svalbard and Jan Mayen", "SK": "Slovakia", "SL": "Sierra Leone", "SM": "San Marino", "SN": "Senegal",
    "SO": "Somalia", "SR": "Suriname", "SS": "South Sudan", "ST": "Sao Tome and Principe", "SV": "El Salvador",
    "SX": "Sint Maarten (Dutch part)", "SY": "Syrian Arab Republic", "SZ": "Eswatini", "TC": "Turks and Caicos Islands",
    "TD": "Chad", "TF": "French Southern Territories", "TG": "Togo", "TH": "Thailand", "TJ": "Tajikistan",
    "TK": "Tokelau", "TL": "Timor-Leste", "TM": "Turkmenistan", "TN": "Tunisia", "TO": "Tonga",
    "TR": "Türkiye", "TT": "Trinidad and Tobago", "TV": "Tuvalu", "TW": "Taiwan, Province of China",
    "TZ": "Tanzania, United Republic of", "UA": "Ukraine", "UG": "Uganda", "UM": "United States Minor Outlying Islands",
    "US": "United States of America", "UY": "Uruguay", "UZ": "Uzbekistan", "VA": "Holy See", "VC": "Saint Vincent and the Grenadines",
    "VE": "Venezuela (Bolivarian Republic of)", "VG": "Virgin Islands (British)", "VI": "Virgin Islands (U.S.)",
    "VN": "Viet Nam", "VU": "Vanuatu", "WF": "Wallis and Futuna", "WS": "Samoa", "YE": "Yemen",
    "YT": "Mayotte", "ZA": "South Africa", "ZM": "Zambia", "ZW": "Zimbabwe"
};

// Helper function to show toast messages
function showToast({ title, description, variant }) {
    const toast = document.createElement('div');
    toast.classList.add('toast-notification');
    if (variant === 'destructive') {
        toast.classList.add('toast-destructive');
    } else if (variant === 'success') {
        toast.classList.add('toast-success');
    }
    toast.innerHTML = `
        <h4 class="toast-title">${title}</h4>
        <p class="toast-description">${description}</p>
        <button class="toast-close-btn">&times;</button>
    `;
    toastContainer.appendChild(toast);
    const closeButton = toast.querySelector('.toast-close-btn');
    closeButton.addEventListener('click', () => {
        toast.classList.add('hide');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    });
    setTimeout(() => {
        if (toast.parentNode === toastContainer) {
            toast.classList.add('hide');
            toast.addEventListener('animationend', () => toast.remove(), { once: true });
        }
    }, 3000);
}

// Custom icon URLs for weather conditions
const customIcons = {
    "01d": "https://cdn-icons-png.freepik.com/256/7645/7645246.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming",
    "01n": "https://cdn-icons-png.freepik.com/256/10440/10440114.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming",
    "02d": "https://cdn-icons-png.freepik.com/256/15201/15201043.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming",
    "02n": "https://cdn-icons-png.freepik.com/256/15201/15201043.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming",
    "03d": "https://cdn-icons-png.freepik.com/256/1417/1417777.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming",
    "03n": "https://cdn-icons-png.freepik.com/256/1417/1417777.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming",
    "04d": "https://cdn-icons-png.freepik.com/256/13762/13762834.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming",
    "04n": "https://cdn-icons-png.freepik.com/256/13762/13762834.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming",
    "09d": "https://th.bing.com/th/id/OIP.ulwM8AnrrA8xPJJpzmyaCAHaHa?rs=1&pid=ImgDetMain.png",
    "09n": "https://th.bing.com/th/id/OIP.ulwM8AnrrA8xPJJpzmyaCAHaHa?rs=1&pid=ImgDetMain.png",
    "10d": "https://th.bing.com/th/id/OIP.ulwM8AnrrA8xPJJpzmyaCAHaHa?rs=1&pid=ImgDetMain.png",
    "10n": "https://th.bing.com/th/id/OIP.ulwM8AnrrA8xPJJpzmyaCAHaHa?rs=1&pid=ImgDetMain.png",
    "11d": "https://cdn-icons-png.freepik.com/256/9139/9139426.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming",
    "11n": "https://cdn-icons-png.freepik.com/256/9523/9523135.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming",
    "13d": "https://cdn-icons-png.freepik.com/256/6235/6235533.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming",
    "13n": "https://cdn-icons-png.freepik.com/256/6235/6235533.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming",
    "50d": "https://cdn-icons-png.freepik.com/256/13594/13594982.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming",
    "50n": "https://cdn-icons-png.freepik.com/256/13594/13594982.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming"
};

// Render functions for various weather components
function renderWeatherCard(weather) {
    if (!weather) {
        weatherCard.innerHTML = ''; // Clear card if no weather data
        return;
    }
    const iconUrl = customIcons[weather.icon] || "https://cdn-icons-png.freepik.com/256/7645/7645246.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming";

    const currentTimestampMs = Date.now();
    const cityTimezoneOffsetMs = weather.timezone * 1000;
    const cityLocalTimestampMs = currentTimestampMs + cityTimezoneOffsetMs;
    const cityDate = new Date(cityLocalTimestampMs);

    const formattedCityDate = cityDate.toLocaleDateString([], {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'
    });
    const formattedCityTime = cityDate.toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC'
    });

    const fullCountryName = countryNames[weather.country] || weather.country;

    weatherCard.innerHTML = `
        <h2 id="location-display">${weather.name}, ${fullCountryName}</h2>
        <br>
       <p class="weather-temp">
  ${Math.round(weather.temp)}&deg;C 
  <span class="feels-like">(Feels like: ${Math.round(weather.feels_like)}&deg;C)</span>
</p>

        <p class="weather-datetime-text">Date: ${formattedCityDate} </p>
        <p class="weather-datetime-text">Time: ${formattedCityTime}</p>
      
        <img src="${iconUrl}" alt="${weather.description}" class="weather-icon" />
        <p class="desc">${weather.description}</p>
    `;
}

// Renders the hourly weather block on the main card (original logic from your initial code)
function renderHourlyWeatherBlock(dateKey = new Date().toISOString().split('T')[0]) {
    const selectedDate = new Date(dateKey);
    const todayKey = selectedDate.toISOString().split('T')[0];
    const hourlyDataForToday = fullForecastData[todayKey] || [];

    if (hourlyDataForToday.length === 0) {
        hourlyWeatherContainer.innerHTML = '<h3>Hourly Weather</h3><p>No hourly weather data available for today.</p>';
        return;
    }

    const now = new Date();
    const currentHour = now.getHours();

    // Define time slots from 00:00 to 22:00 in 2-hour intervals
    const timeArray = [];
    for (let i = 0; i <= 22; i += 2) {
        // Exclude current hour, previous hour, and next hour
        if (i === currentHour || i === currentHour - 1 || i === currentHour + 1) {
            continue;
        }
        timeArray.push(i.toString().padStart(2, '0') + ':00');
    }

    const hourlyWeatherHtml = timeArray.map(timeStr => {
        const [targetHour, targetMin] = timeStr.split(':').map(Number);
        const targetTotalMinutes = targetHour * 60 + targetMin;

        let closest = null;
        let minDiff = Infinity;

        hourlyDataForToday.forEach(item => {
            const itemLocalDate = new Date(item.dt * 1000 + timezoneOffset * 1000);
            const itemHour = itemLocalDate.getHours();
            const itemMin = itemLocalDate.getMinutes();
            const itemTotalMinutes = itemHour * 60 + itemMin;

            const diff = Math.abs(targetTotalMinutes - itemTotalMinutes);
            if (diff < minDiff) {
                minDiff = diff;
                closest = item;
            }
        });

        if (!closest) return '';

        const displayHour = targetHour % 12 === 0 ? 12 : targetHour % 12;
        const ampm = targetHour < 12 ? 'AM' : 'PM';
        const displayTime = `${displayHour}:00 ${ampm}`;

        const iconUrl = customIcons[closest.weather[0].icon] || "https://cdn-icons-png.freepik.com/256/7645/7645246.png";

        return `
            <div class="hourly-item">
                <div class="hourly-time">${displayTime}</div>
                <img src="${iconUrl}" alt="${closest.weather[0].description}" class="hourly-icon" />
                <div class="hourly-temp">${Math.round(closest.main.temp)}&deg;C</div>
                <div class="hourly-description">${closest.weather[0].description}</div>
            </div>
        `;
    }).join('');

    hourlyWeatherContainer.innerHTML = `
        <h3>Hourly Weather for ${todayKey}</h3>
        <div class="hourly-weather-summary">
            ${hourlyWeatherHtml}
        </div>
    `;
}




// Renders the 5-day forecast card
function renderForecastCard(forecast) {
    if (!forecast || forecast.length === 0) {
        forecastCard.innerHTML = '<p style="text-align: center; ; font-size: 1rem;">No forecast data available.</p>';
        // Ensure the card itself is hidden if no data
        forecastCard.style.display = 'none';
        return;
    }
    const itemsHtml = forecast.map(day => {
        const dateObj = new Date(day.date);
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        const formattedDate = dateObj.toLocaleDateString([], options);
        const dateKey = day.date.split(" ")[0];
        const forecastIconUrl = customIcons[day.icon] || "https://cdn-icons-png.freepik.com/256/7645/7645246.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming";

        return `
            <div class="forecast-day" data-date="${dateKey}">
                <div class="forecast-date-temps">
                    <div class="forecast-date">${formattedDate}</div>
                    <div class="forecast-max-min-temps">
                        <div class="forecast-temp">Max: ${Math.round(day.temp_max)}&deg;C</div>
                        <div class="forecast-temp">Min: ${Math.round(day.temp_min)}&deg;C</div>
                    </div>
                </div>
                <div class="forecast-icon-description-group">
                    <img src="${forecastIconUrl}" alt="${day.description}" class="forecast-icon-small" />
                    <div class="forecast-description">${day.description}</div>
                </div>
            </div>
        `;
    }).join('');
    forecastCard.innerHTML = itemsHtml;
    forecastCard.style.display = 'block'; // Ensure card is visible if data exists

    document.querySelectorAll('.forecast-day').forEach(card => {
        card.addEventListener('click', (event) => {
            const selectedDate = event.currentTarget.dataset.date;
            displayHourlyForecast(selectedDate);
        });
    });
}

// Renders detailed weather information
function renderWeatherDetails(details) {
    if (!details) {
        weatherDetails.innerHTML = '';
        weatherDetails.style.display = 'none'; // Ensure block is hidden if no details
        return;
    }

    weatherDetails.innerHTML = `
        <div class="details-grid">
            <div class="detail-item">
                <div class="detail-label">Pressure</div>
                <div class="detail-flex">
                    <img src="https://cdn-icons-png.freepik.com/256/4117/4117372.png" alt="Pressure Icon" class="detail-icon" />
                    <div class="detail-value">${details.pressure} hPa</div>
                </div>
            </div>

            <div class="detail-item">
                <div class="detail-label">Humidity</div>
                <div class="detail-flex">
                    <img src="https://cdn-icons-png.freepik.com/256/7925/7925310.png" alt="Humidity Icon" class="detail-icon" />
                    <div class="detail-value">${details.humidity} %</div>
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Visibility</div>
                <div class="detail-flex">
                    <img src="https://cdn-icons-png.freepik.com/256/18385/18385524.png" alt="Visibility Icon" class="detail-icon" />
                    <div class="detail-value">${(details.visibility / 1000).toFixed(1)} km</div>
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Wind Speed</div>
                <div class="detail-flex">
                    <img src="https://cdn-icons-png.freepik.com/256/11924/11924923.png" alt="Wind Speed Icon" class="detail-icon" />
                    <div class="detail-value">${details.wind_speed} m/s</div>
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Wind Direction</div>
                <div class="detail-flex">
                    <img src="https://cdn-icons-png.flaticon.com/512/341/341917.png" alt="Wind Direction Icon" class="detail-icon" />
                    <div class="detail-value">${details.wind_deg}&deg;</div>
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Feels Like</div>
                <div class="detail-flex">
                    <img src="https://cdn-icons-png.freepik.com/256/15289/15289941.png" alt="Feels Like Icon" class="detail-icon" />
                    <div class="detail-value">${Math.round(details.feels_like)}&deg;C</div>
                </div>
            </div>
            <div class="detail-item sunrise">
                <div class="detail-label">Sunrise</div>
                <div class="detail-flex">
                    <img src="https://cdn-icons-png.freepik.com/256/12276/12276857.png" alt="Sunrise Icon" class="detail-icon" />
                    <div class="detail-value">${new Date(details.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }</div>
                </div>
            </div>
            <div class="detail-item sunset">
                <div class="detail-label">Sunset</div>
                <div class="detail-flex">
                    <img src="https://cdn-icons-png.freepik.com/256/4415/4415117.png" alt="Sunset Icon" class="detail-icon" />
                    <div class="detail-value">${new Date(details.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }</div>
                </div>
            </div>
        </div>
    `;
    weatherDetails.style.display = 'block'; // Ensure block is visible if details exist
}

// Function to control loading state visibility and main content visibility
function showLoading(isLoading, isError = false) {
    loadingDiv.style.display = isLoading ? 'block' : 'none';
    weatherContainer.style.opacity = isLoading ? '0' : '1';
    weatherContainer.style.pointerEvents = isLoading ? 'none' : 'auto';

    const leftColumn = document.querySelector('.left-column');
    const rightColumn = document.querySelector('.right-column');
    const mainLayout = document.getElementById('main-weather-layout');

    // If loading, or if an error occurred, hide all main weather content
    if (isLoading || isError) {
        weatherContainer.style.display = 'none';
        weatherDetails.style.display = 'none';
        forecastCard.style.display = 'none';
        hourlyWeatherContainer.style.display = 'none'; // Also hide the hourly container
        if (leftColumn) leftColumn.style.display = 'none';
        if (rightColumn) rightColumn.style.display = 'none';
        if (mainLayout) mainLayout.style.display = 'none';
        // Reset background to default on error
        if (isError) {
            document.body.style.backgroundColor = '#152544';
        }
    } else { // If not loading and no error, show main weather content
        weatherContainer.style.display = 'block'; // Or 'flex' based on your layout
        weatherDetails.style.display = 'block'; // Or 'flex'
        forecastCard.style.display = 'block'; // Or 'flex'
        hourlyWeatherContainer.style.display = 'block'; // Or 'flex'
        if (leftColumn) leftColumn.style.display = 'flex'; // Assuming flex for columns
        if (rightColumn) rightColumn.style.display = 'flex'; // Assuming flex for columns
        if (mainLayout) mainLayout.style.display = 'flex'; // Assuming flex for main layout
    }
}

// Displays the 3-hour forecast for a specific date in a modal (original logic)
function displayHourlyForecast(dateKey) {
    const selectedDate = new Date(dateKey);

    // Filter all forecast items that belong to the selected date (adjusted to local time)
    const hourlyData = fullHourlyList.filter(item => {
        const localTime = new Date(item.dt * 1000 + timezoneOffset * 1000);
        return localTime.toISOString().split('T')[0] === dateKey;
    });

    // Show a toast if no hourly data exists
    if (hourlyData.length === 0) {
        showToast({
            title: "No Data",
            description: "No detailed hourly forecast available for this day.",
            variant: 'destructive'
        });
        return;
    }

    // Sort the filtered data chronologically by local time
    hourlyData.sort((a, b) => {
        const timeA = new Date(a.dt * 1000 + timezoneOffset * 1000).getTime();
        const timeB = new Date(b.dt * 1000 + timezoneOffset * 1000).getTime();
        return timeA - timeB;
    });

    // Set a cutoff time of 11:59 PM local time for the selected date
    const cutoff = new Date(dateKey + 'T23:59:59');
    const cutoffTimestamp = cutoff.getTime();

    // Filter out any entries that fall beyond 11:59 PM
    const filteredHourlyData = hourlyData.filter(item => {
        const itemLocalTime = new Date(item.dt * 1000 + timezoneOffset * 1000).getTime();
        return itemLocalTime <= cutoffTimestamp;
    });

    // Format the modal title
    const titleOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedTitleDate = selectedDate.toLocaleDateString([], titleOptions);
    hourlyForecastTitle.textContent = `Hourly Forecast for ${formattedTitleDate}`;

    // Clear previous data
    hourlyForecastGrid.innerHTML = '';

    // Render each hourly item
    filteredHourlyData.forEach(item => {
        const localTime = new Date(item.dt * 1000 + timezoneOffset * 1000);
        const time = localTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        const iconUrl = customIcons[item.weather[0].icon] || "https://cdn-icons-png.freepik.com/256/7645/7645246.png";

        const hourlyItemHtml = `
            <div class="hourly-item">
                <div class="hourly-time">${time}</div>
                <img src="${iconUrl}" alt="${item.weather[0].description}" class="hourly-icon" />
                <div class="hourly-temp">${Math.round(item.main.temp)}&deg;C</div>
                <div class="hourly-description">${item.weather[0].description}</div>
            </div>
        `;

        hourlyForecastGrid.insertAdjacentHTML('beforeend', hourlyItemHtml);
    });

    // Show the modal
    showHourlyForecastModal();
}


// Shows the hourly forecast modal
function showHourlyForecastModal() {
    hourlyForecastModal.style.display = 'flex';
    void hourlyForecastModal.offsetWidth; // Trigger reflow for transition
    hourlyForecastModal.classList.add('show');
}

// Hides the hourly forecast modal
function hideHourlyForecastModal() {
    hourlyForecastModal.classList.remove('show');
    hourlyForecastModal.addEventListener('transitionend', () => {
        hourlyForecastModal.style.display = 'none';
    }, { once: true });
}

document.body.style.background = 'linear-gradient(145deg, #1A1A2E, #16213E, #0F3460)';
document.body.style.backgroundSize = 'cover';
document.body.style.backgroundRepeat = 'no-repeat';
document.body.style.backgroundPosition = 'center';
document.body.style.backgroundAttachment = 'fixed'; // Ensure this is consistently applied 

// Main function to load and display weather data
async function loadWeatherData(lat, lon) {
    try {
        showLoading(true); // Start loading, hide content
        console.log('Loading weather data for:', lat, lon);

        const { todayForecast, summarizedForecast } = await getForecast(lat, lon);
        const weatherData = await getCurrentWeather(lat, lon);

        currentCoordinates = { lat, lon };

        renderWeatherCard(weatherData); // Removed todayForecast from here, it's not used in this render function
        renderForecastCard(summarizedForecast);
        renderWeatherDetails({
            pressure: weatherData.pressure,
            humidity: weatherData.humidity,
            visibility: weatherData.visibility,
            wind_speed: weatherData.wind_speed,
            wind_deg: weatherData.wind_deg,
            feels_like: weatherData.feels_like,
            sunrise: weatherData.sunrise,
            sunset: weatherData.sunset,
        });

        renderHourlyWeatherBlock();

        const iconCode = weatherData.icon;
        const gifUrl = weatherGifs[iconCode];
        document.body.style.backgroundImage = `url(${gifUrl})`;
 // Ensure this is consistently applied

        // After successful data load, show the elements
        showLoading(false); // End loading, show content
        weatherContainer.classList.add('fade-in');
        
   if (weatherCard) {
    const offset = 120; // More noticeable scroll offset
    const top = weatherCard.getBoundingClientRect().top + window.pageYOffset - offset;

    window.scrollTo({
        top: top,
        behavior: 'smooth'
    });
}

        const fullCountryName = countryNames[weatherData.country] || weatherData.country;
        showToast({ title: "Weather data loaded", description: `Current weather for ${weatherData.name}, ${fullCountryName}`, variant: 'success' });
    } catch (err) {
        console.error("Error loading weather data:", err);
        showLoading(false, true); // End loading, indicating an error occurred
        showToast({ variant: 'destructive', title: "Error", description: "Failed to load weather data. Please try again. " + err.message });
        // The showLoading(false, true) call above will handle hiding all elements and resetting background
    }
}

document.body.style.background = 'linear-gradient(145deg, #1A1A2E, #16213E, #0F3460)';
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';

// Function to search for a city
async function searchCity(city) {
    if (!city.trim()) {
        showToast({ variant: 'destructive', title: "Input Error", description: "Please enter a city name." });
        return;
    }

    try {
        showLoading(true); // Start loading, hide content
        console.log('Searching city:', city);
        const weatherData = await getWeatherByCity(city);

        currentCoordinates = weatherData.coord;

        const { todayForecast, summarizedForecast } = await getForecast(currentCoordinates.lat, currentCoordinates.lon);

        renderWeatherCard(weatherData); // Removed todayForecast from here
        renderForecastCard(summarizedForecast);
        renderWeatherDetails({
            pressure: weatherData.pressure,
            humidity: weatherData.humidity,
            visibility: weatherData.visibility,
            wind_speed: weatherData.wind_speed,
            wind_deg: weatherData.wind_deg,
            feels_like: weatherData.feels_like,
            sunrise: weatherData.sunrise,
            sunset: weatherData.sunset,
        });

        renderHourlyWeatherBlock();

        const iconCode = weatherData.icon;
        const gifUrl = weatherGifs[iconCode];
        document.body.style.backgroundImage = `url(${gifUrl})`;
 // Ensure this is consistently applied

        // After successful data load, show the elements
        showLoading(false); // End loading, show content
        weatherContainer.classList.add('fade-in');

   if (weatherCard) {
    const offset = 120; // More noticeable scroll offset
    const top = weatherCard.getBoundingClientRect().top + window.pageYOffset - offset;

    window.scrollTo({
        top: top,
        behavior: 'smooth'
    });
}

        const fullCountryName = countryNames[weatherData.country] || weatherData.country;
        showToast({ title: "City found", description: `Weather data for ${weatherData.name}, ${fullCountryName}`, variant: 'success' });
    } catch (err) {
        document.body.style.background = 'linear-gradient(145deg, #1A1A2E, #16213E, #0F3460)';
        console.error("Error searching city:", err);
        showLoading(false, true); // End loading, indicating an error occurred
        showToast({ variant: 'destructive', title: "City not found", description: "Please check the city name and try again. " + err.message });
        
        // The showLoading(false, true) call above will handle hiding all elements and resetting background
    }
}

// Handle location button click
async function handleLocationClick() {
    try {
        showLoading(true); // Start loading, hide content
        const location = await getCurrentLocation();
        await loadWeatherData(location.lat, location.lon);
    } catch (err) {
        console.error("Location error:", err);
        showLoading(false, true); // End loading, indicating an error occurred
        showToast({ variant: 'destructive', title: "Location Error", description: "Unable to get your location. Please search for a city instead. " + err.message });
        // The showLoading(false, true) call above will handle hiding all elements and resetting background
    }
}


// Event listeners
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    searchCity(cityInput.value);
});

locationBtn.addEventListener('click', () => {
    handleLocationClick();
});

modalCloseBtn.addEventListener('click', hideHourlyForecastModal);
hourlyForecastModal.addEventListener('click', (event) => {
    if (event.target === hourlyForecastModal) {
        hideHourlyForecastModal();
    }
});

// Initialize on page load
window.addEventListener('load', () => {
    
    handleLocationClick();
});
