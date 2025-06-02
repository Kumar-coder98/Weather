
// Your weather API key
const API_KEY = 'aa0ae27e321c7b189650522b6a20cba1';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Helper functions for API calls
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Network response was not ok');
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
  };
}

async function getWeatherByCity(city) {
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
  };
}

async function getForecast(lat, lon) {
  const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  const data = await fetchJSON(url);
  const daily = {};
  data.list.forEach(item => {
    const date = item.dt_txt.split(" ")[0];
    if (!daily[date]) daily[date] = item;
  });
  return Object.values(daily).slice(0, 5).map(item => ({
    date: item.dt_txt.split(" ")[0],
    temp_max: item.main.temp_max,
    temp_min: item.main.temp_min,
    description: item.weather[0].description,
    main: item.weather[0].main,
    humidity: item.main.humidity
  }));
}

function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        let message = '';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied. Please allow location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out.';
            break;
          default:
            message = 'An unknown error occurred while fetching location.';
            break;
        }
        reject(new Error(message));
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
const weatherContainer = document.getElementById('weather-container');
const weatherCard = document.getElementById('weather-card');
const forecastCard = document.getElementById('forecast-card');
const weatherDetails = document.getElementById('weather-details');

// State
let currentCoordinates = null;

// Background settings
document.body.style.background = 'linear-gradient(to bottom right, #2dd4bf, #14b8a6, #0f766e)';

// Weather GIFs based on conditions
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

// Helper: Show toast messages (simple)
function showToast({ title, description, variant }) {
  if (variant === 'destructive') {
    alert(`${title}: ${description}`);
  } else {
    console.log(`${title}: ${description}`);
  }
}

// Render functions
function renderWeatherCard(weather) {
  if (!weather) return;
  const iconUrl = customIcons[weather.icon] || "images/default.png";

  weatherCard.innerHTML = `
    <h2>${weather.name}, ${weather.country}</h2>
    <br>
    <br>
    <p class="weather-temp">${Math.round(weather.temp)}&deg;C</p>
    <p>Feels like: ${Math.round(weather.feels_like)}&deg;C</p>
    <img src="${iconUrl}" alt="${weather.description}" class="weather-icon" />
    <p class="desc">${weather.description}</p>
   
  `;
}

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

function renderForecastCard(forecast) {
  if (!forecast || forecast.length === 0) {
    forecastCard.innerHTML = '<p>No forecast data available.</p>';
    return;
  }
  const itemsHtml = forecast.map(day => {
    const dateObj = new Date(day.date);
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    const formattedDate = dateObj.toLocaleDateString([], options);
    return `
    <div class="forecast-day">
      <div class="forecast-date">${formattedDate}</div>
      <div class="forecast-temp">Max: ${Math.round(day.temp_max)}&deg;C</div>
      <div class="forecast-temp">Min: ${Math.round(day.temp_min)}&deg;C</div>
      <div style="text-transform: capitalize;">${day.description}</div>
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

async function loadWeatherData(lat, lon) {
  try {
    showLoading(true);
    console.log('Loading weather data for:', lat, lon);

    const [weatherData, forecastData] = await Promise.all([
      getCurrentWeather(lat, lon),
      getForecast(lat, lon),
    ]);

    currentCoordinates = { lat, lon };

    renderWeatherCard(weatherData);
    renderForecastCard(forecastData);
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

    // Change background to GIF based on weather condition
    const iconCode = weatherData.icon; // Get the icon code (e.g., "01d")
    const gifUrl = weatherGifs[iconCode] || 'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif'; // Default fallback
    document.body.style.backgroundImage = `url(${gifUrl})`;
    document.body.style.backgroundSize = 'cover'; // Ensures the image covers the entire background
    document.body.style.backgroundRepeat = 'no-repeat'; // Prevents the image from repeating
    document.body.style.backgroundPosition= 'center'; // Centers the image

    weatherContainer.style.display = 'block';
    showToast({ title: "Weather data loaded", description: `Current weather for ${weatherData.name}` });
  } catch (err) {
    console.error(err);
    showToast({ variant: 'destructive', title: "Error", description: "Failed to load weather data. Please try again." });
    weatherContainer.style.display = 'none';
  } finally {
    showLoading(false);
  }
}

async function searchCity(city) {
  if (!city.trim()) return;
  try {
    showLoading(true);
    console.log('Searching city:', city);
    const weatherData = await getWeatherByCity(city);

    currentCoordinates = weatherData.coord;

    renderWeatherCard(weatherData);

    if (currentCoordinates) {
      const forecastData = await getForecast(currentCoordinates.lat, currentCoordinates.lon);
      renderForecastCard(forecastData);
    } else {
      forecastCard.innerHTML = '<p>No forecast data available.</p>';
    }

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

    // Change background to GIF based on weather condition
    const iconCode = weatherData.icon; // Get the icon code (e.g., "01d")
    const gifUrl = weatherGifs[iconCode] || 'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif'; // Default fallback
    document.body.style.backgroundImage = `url(${gifUrl})`;
    document.body.style.backgroundSize = 'cover'; // Ensures the image covers the entire background
    document.body.style.backgroundRepeat = 'no-repeat'; // Prevents the image from repeating
    document.body.style.backgroundPosition= 'center'; // Centers the image

    weatherContainer.style.display = 'block';
    showToast({ title: "City found", description: `Weather data for ${weatherData.name}` });
  } catch (err) {
    console.error(err);
    // Set the background to a default image when the city is not found
     document.body.style.background = 'linear-gradient(to bottom right, #2dd4bf, #14b8a6, #0f766e)'; // Reset to your initial gradient
    showToast({ variant: 'destructive', title: "City not found", description: "Please check the city name and try again." });
    weatherContainer.style.display = 'none';
  } finally {
    showLoading(false);
  }
}


function showLoading(isLoading) {
  loadingDiv.style.display = isLoading ? 'block' : 'none';
}

async function handleLocationClick() {
  try {
    showLoading(true);
    const location = await getCurrentLocation();
    await loadWeatherData(location.lat, location.lon);
  } catch (err) {
    console.error(err);
    showToast({ variant: 'destructive', title: "Location error", description: "Unable to get your location. Please search for a city instead." });
    showLoading(false);
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

// Initialize on page load
window.addEventListener('load', () => {
  handleLocationClick();
});
weatherCard.classList.add('fade-in');
forecastCard.classList.add('fade-in');
weatherDetails.classList.add('fade-in');
