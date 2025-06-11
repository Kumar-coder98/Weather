// Your weather API key
const API_KEY = 'aa0ae27e321c7b189650522b6a20cba1';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Helper functions for API calls
async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) {
        // Throw a specific error for network issues or bad responses
        const errorData = await res.json().catch(() => ({})); // Try to parse error body
        throw new Error(`HTTP error! Status: ${res.status}, Message: ${errorData.message || res.statusText}`);
    }
    return await res.json();
}

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
        timezone: data.timezone, // Include timezone offset from UTC in seconds
    };
}

async function getWeatherByCity(city) {
    document.body.style.backgroundAttachment = 'fixed'; // Ensure background attachment remains fixed
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
        timezone: data.timezone, // Include timezone offset from UTC in seconds
    };
}

async function getForecast(lat, lon) {
    const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const data = await fetchJSON(url);
    const daily = {};
    // Group forecast data by date, taking the first entry for each day
    data.list.forEach(item => {
        const date = item.dt_txt.split(" ")[0];
        if (!daily[date]) {
            daily[date] = item;
        }
    });
    // Return only the next 5 days of forecast
    return Object.values(daily).slice(0, 5).map(item => ({
        date: item.dt_txt, // Keep full datetime for proper Date object creation
        temp_max: item.main.temp_max,
        temp_min: item.main.temp_min,
        description: item.weather[0].description,
        main: item.weather[0].main,
        humidity: item.main.humidity,
        icon: item.weather[0].icon, // Include icon for forecast cards
    }));
}

async function getCurrentLocation() {
    document.body.style.backgroundAttachment = 'fixed'; // Ensure background attachment remains fixed

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
                    // Fetch location name using BigDataCloud API
                    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
                    const data = await res.json();
                    // Prioritize city, then locality, then subdivision, fallback to generic
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


// UI Elements
const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const locationBtn = document.getElementById('location-btn');
const loadingDiv = document.getElementById('loading');
const weatherContainer = document.getElementById('weather-container'); // Main container for all weather data
const weatherCard = document.getElementById('weather-card'); // Element for current weather display
const forecastCard = document.getElementById('forecast-card'); // Element for 5-day forecast display
const weatherDetails = document.getElementById('weather-details'); // Element for detailed weather info
const toastContainer = document.getElementById('toast-container'); // Container for toast messages

// State
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
    "PH": "Philippines", "PK": "Pakistan", "PL": "Poland", "PM": "Saint Pierre and Micquelon", "PN": "Pitcairn",
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


// Helper: Show toast messages (custom DOM element instead of alert)
function showToast({ title, description, variant }) {
    // Clear existing toasts if any (optional, but good for single-error display)
    // toastContainer.innerHTML = ''; 

    const toast = document.createElement('div');
    toast.classList.add('toast-notification');
    
    // Add variant-specific classes for styling (e.g., background color)
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

    // Add event listener to close button
    const closeButton = toast.querySelector('.toast-close-btn');
    closeButton.addEventListener('click', () => {
        toast.classList.add('hide'); // Add a class for fade-out animation
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    });

    // Automatically remove toast after 5 seconds
    setTimeout(() => {
        if (toast.parentNode === toastContainer) { // Check if it hasn't been manually closed
            toast.classList.add('hide'); // Add a class for fade-out animation
            toast.addEventListener('animationend', () => toast.remove(), { once: true });
        }
    }, 5000); // 5 seconds
}


// Render functions
function renderWeatherCard(weather) {
    if (!weather) return;
    const iconUrl = customIcons[weather.icon] || "https://cdn-icons-png.freepik.com/256/7645/7645246.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming"; // Fallback to a default clear sky icon

    // Calculate the current UTC timestamp (milliseconds since epoch).
    const currentTimestampMs = Date.now(); 
    // City's timezone offset from UTC in milliseconds.
    const cityTimezoneOffsetMs = weather.timezone * 1000; 

    // Calculate the current local timestamp in the city.
    const cityLocalTimestampMs = currentTimestampMs + cityTimezoneOffsetMs;
    
    // Create a Date object from this calculated timestamp.
    const cityDate = new Date(cityLocalTimestampMs);

    // Format the date for the city, now including the year.
    const formattedCityDate = cityDate.toLocaleDateString([], {
        weekday: 'short',   // e.g., "Mon"
        month: 'short',     // e.g., "Jul"
        day: 'numeric',     // e.g., "25"
        year: 'numeric',    // NEW: e.g., "2024"
        timeZone: 'UTC'     // Crucial to interpret cityDate's internal value as UTC for correct formatting
    });

    // Format the time for the city.
    const formattedCityTime = cityDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true, // Display in 12-hour format with AM/PM
        timeZone: 'UTC' // Crucial for displaying the exact calculated local time
    });

    // Get the full country name from the mapping
    const fullCountryName = countryNames[weather.country] || weather.country; // Fallback to code if not found

    weatherCard.innerHTML = `
        <h2 id="location-display">${weather.name}, ${fullCountryName}</h2>
        <br>
        <p class="weather-temp">${Math.round(weather.temp)}&deg;C</p>
        <p class="weather-datetime-text">Date: ${formattedCityDate}</p> <!-- Added new class -->
        <p class="weather-datetime-text">Time: ${formattedCityTime}</p> <!-- Added new class -->
        <p>Feels like: ${Math.round(weather.feels_like)}&deg;C</p>
        <img src="${iconUrl}" alt="${weather.description}" class="weather-icon" />
        <p class="desc">${weather.description}</p>
    `;
}

// Custom icons mapping OpenWeatherMap icons to your desired icons
const customIcons = {
    "01d": "https://cdn-icons-png.freepik.com/256/7645/7645246.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming", // Clear Day
    "01n": "https://cdn-icons-png.freepik.com/256/10440/10440114.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming", // Clear Night
    "02d": "https://cdn-icons-png.freepik.com/256/15201/15201043.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming", // Few Clouds Day
    "02n": "https://cdn-icons-png.freepik.com/256/15201/15201043.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming", // Few Clouds Night
    "03d": "https://cdn-icons-png.freepik.com/256/1417/1417777.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming", // Scattered Clouds
    "03n": "https://cdn-icons-png.freepik.com/256/1417/1417777.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming", // Scattered Clouds
    "04d": "https://cdn-icons-png.freepik.com/256/13762/13762834.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming", // Broken Clouds
    "04n": "https://cdn-icons-png.freepik.com/256/13762/13762834.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming", // Broken Clouds
    "09d": "https://th.bing.com/th/id/OIP.ulwM8AnrrA8xPJJpzmyaCAHaHa?rs=1&pid=ImgDetMain.png", // Shower Rain
    "09n": "https://th.bing.com/th/id/OIP.ulwM8AnrrA8xPJJpzmyaCAHaHa?rs=1&pid=ImgDetMain.png", // Shower Rain
    "10d": "https://th.bing.com/th/id/OIP.ulwM8AnrrA8xPJJpzmyaCAHaHa?rs=1&pid=ImgDetMain.png", // Rain
    "10n": "https://th.bing.com/th/id/OIP.ulwM8AnrrA8xPJJpzmyaCAHaHa?rs=1&pid=ImgDetMain.png", // Rain
    "11d": "https://cdn-icons-png.freepik.com/256/9139/9139426.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming", // Thunderstorm
    "11n": "https://cdn-icons-png.freepik.com/256/9523/9523135.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming", // Thunderstorm
    "13d": "https://cdn-icons-png.freepik.com/256/6235/6235533.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming", // Snow
    "13n": "https://cdn-icons-png.freepik.com/256/6235/6235533.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming", // Snow
    "50d": "https://cdn-icons-png.freepik.com/256/13594/13594982.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming", // Mist/Fog
    "50n": "https://cdn-icons-png.freepik.com/256/13594/13594982.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming" // Mist/Fog
};

function renderForecastCard(forecast) {
    if (!forecast || forecast.length === 0) {
        forecastCard.innerHTML = '<p style="text-align: center; color: #64748b; font-size: 1rem;">No forecast data available.</p>';
        return;
    }
    const itemsHtml = forecast.map(day => {
        const dateObj = new Date(day.date);
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        const formattedDate = dateObj.toLocaleDateString([], options);
        // Fallback icon for forecast if custom icon is not found
        const forecastIconUrl = customIcons[day.icon] || "https://cdn-icons-png.freepik.com/256/7645/7645246.png?ga=GA1.1.610150482.1748688071&semt=ais_incoming"; // A generic icon

        return `
            <div class="forecast-day">
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
}

function renderWeatherDetails(details) {
    if (!details) {
        weatherDetails.innerHTML = '';
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
}

// Function to control loading state
function showLoading(isLoading) {
    loadingDiv.style.display = isLoading ? 'block' : 'none';
    weatherContainer.style.opacity = isLoading ? '0' : '1'; // Hide/show weather content during loading
    weatherContainer.style.pointerEvents = isLoading ? 'none' : 'auto'; // Disable interaction
}

// Main function to load and display weather data
async function loadWeatherData(lat, lon) {
    try {
        showLoading(true); // Show loading spinner
        console.log('Loading weather data for:', lat, lon);

        const [weatherData, forecastData] = await Promise.all([
            getCurrentWeather(lat, lon),
            getForecast(lat, lon),
        ]);

        currentCoordinates = { lat, lon }; // Update global coordinates

        renderWeatherCard(weatherData); // Render current weather
        renderForecastCard(forecastData); // Render 5-day forecast
        renderWeatherDetails({ // Render detailed weather information
            pressure: weatherData.pressure,
            humidity: weatherData.humidity,
            visibility: weatherData.visibility,
            wind_speed: weatherData.wind_speed,
            wind_deg: weatherData.wind_deg,
            feels_like: weatherData.feels_like,
            sunrise: weatherData.sunrise,
            sunset: weatherData.sunset,
        });

        // Set dynamic background image based on weather condition icon
        const iconCode = weatherData.icon;
        const gifUrl = weatherGifs[iconCode];
        document.body.style.backgroundImage = `url(${gifUrl})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundPosition = 'center';

        weatherContainer.style.display = 'block'; // Make weather container visible
        weatherContainer.classList.add('fade-in'); // Apply fade-in animation

        // --- Conditional Scroll Behavior ---
        if (window.innerWidth > 768) { // Check if the view is desktop
            // Smooth scroll to the weather card (which contains the temperature)
            if (weatherCard) {
                weatherCard.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start' // This will place the top of the weather card at the top of the viewport
                });
            }
        }
        // --- End Conditional Scroll Behavior ---

        const fullCountryName = countryNames[weatherData.country] || weatherData.country;
        showToast({ title: "Weather data loaded", description: `Current weather for ${weatherData.name}, ${fullCountryName}`, variant: 'success' }); // Added success variant
    } catch (err) {
        console.error("Error loading weather data:", err);
        showToast({ variant: 'destructive', title: "Error", description: "Failed to load weather data. Please try again. " + err.message });
        weatherContainer.style.display = 'none'; // Hide weather container on error
    } finally {
        showLoading(false); // Hide loading spinner
    }
}

// Function to search for a city
async function searchCity(city) {
    if (!city.trim()) {
        showToast({ variant: 'destructive', title: "Input Error", description: "Please enter a city name." });
        return; // Do nothing if city input is empty
    }

    try {
        showLoading(true); // Show loading spinner
        console.log('Searching city:', city);
        const weatherData = await getWeatherByCity(city); // Fetch weather by city

        currentCoordinates = weatherData.coord; // Update coordinates

        renderWeatherCard(weatherData); // Render current weather

        if (currentCoordinates) {
            const forecastData = await getForecast(currentCoordinates.lat, currentCoordinates.lon);
            renderForecastCard(forecastData); // Render 5-day forecast
        } else {
            forecastCard.innerHTML = '<p style="text-align: center; color: #64748b; font-size: 1rem;">No forecast data available.</p>';
        }

        renderWeatherDetails({ // Render detailed weather information
            pressure: weatherData.pressure,
            humidity: weatherData.humidity,
            visibility: weatherData.visibility,
            wind_speed: weatherData.wind_speed,
            wind_deg: weatherData.wind_deg,
            feels_like: weatherData.feels_like,
            sunrise: weatherData.sunrise,
            sunset: weatherData.sunset,
        });

        // Set dynamic background image based on weather condition icon
        const iconCode = weatherData.icon;
        const gifUrl = weatherGifs[iconCode];
        document.body.style.backgroundImage = `url(${gifUrl})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundPosition = 'center';

        weatherContainer.style.display = 'block'; // Make weather container visible
        weatherContainer.classList.add('fade-in'); // Apply fade-in animation

        // --- MODIFIED SCROLL BEHAVIOR TO TARGET WEATHER CARD ---
        // Smooth scroll to the weather card (which contains the temperature)
        if (weatherCard) {
            weatherCard.scrollIntoView({
                behavior: 'smooth',
                block: 'start' // This will place the top of the weather card at the top of the viewport
            });
        }
        // --- END MODIFIED SCROLL BEHAVIOR ---

        // Updated toast message to include full country name
        const fullCountryName = countryNames[weatherData.country] || weatherData.country;
        showToast({ title: "City found", description: `Weather data for ${weatherData.name}, ${fullCountryName}`, variant: 'success' });
    } catch (err) {
        console.error("Error searching city:", err);
        // Reset background to the specified solid dark teal color on error
        document.body.style.background = '#1e4b47'; 
        // Show destructive toast message for invalid city
        showToast({ variant: 'destructive', title: "City not found", description: "Please check the city name and try again. " + err.message });
        weatherContainer.style.display = 'none'; // Hide weather container on error
    } finally {
        showLoading(false); // Hide loading spinner
    }
}

// Handle location button click
async function handleLocationClick() {
    try {
        showLoading(true); // Show loading spinner
        const location = await getCurrentLocation(); // Get current device location
        await loadWeatherData(location.lat, location.lon); // Load weather data for the location
    } catch (err) {
        console.error("Location error:", err);
        showToast({ variant: 'destructive', title: "Location Error", description: "Unable to get your location. Please search for a city instead. " + err.message });
        showLoading(false); // Hide loading spinner on error
    }
}

// Event listeners
searchForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent default form submission
    searchCity(cityInput.value); // Trigger city search
});

locationBtn.addEventListener('click', () => {
    handleLocationClick(); // Trigger location based weather
});

// Initialize on page load (load weather for current location)
window.addEventListener('load', () => {
    // Set initial background color for consistency. Dynamic images will override this later.
    document.body.style.backgroundColor = '#1e4b47'; 
    handleLocationClick();
});
