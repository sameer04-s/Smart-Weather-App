
// ======================================
// SKYCAST - SMART WEATHER APPLICATION
// ======================================

const API_KEY = "YOUR_OPENWEATHER_API_KEY";

const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");
const themeBtn = document.getElementById("themeBtn");

const statusMessage = document.getElementById("statusMessage");

// ======================================
// 1. DATE AND TIME
// ======================================

function updateDate() {
    const today = new Date();

    document.getElementById("currentDate").textContent =
        today.toLocaleDateString("en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
}

updateDate();

// ======================================
// 2. SEARCH CITY
// ======================================

async function searchCity(city) {

    if (!city.trim()) {
        statusMessage.textContent = "Please enter a city name.";
        return;
    }

    if (API_KEY === "YOUR_OPENWEATHER_API_KEY") {
        statusMessage.textContent = "Please add your OpenWeather API key in script.js.";
        return;
    }

    try {
        statusMessage.textContent = "Searching weather...";

        const url =
            `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("City search failed.");
        }

        const data = await response.json();

        if (!data.length) {
            throw new Error("City not found. Try another city.");
        }

        const { lat, lon, name, country } = data[0];

        await loadWeather(lat, lon, `${name}, ${country}`);

    } catch (error) {
        statusMessage.textContent = error.message;
    }
}

// Search button
searchBtn.addEventListener("click", () => {
    searchCity(cityInput.value);
});

// Press Enter to search
cityInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        searchCity(cityInput.value);
    }
});

// ======================================
// 3. LOAD ALL WEATHER DATA
// ======================================

async function loadWeather(lat, lon, locationName) {

    try {
        statusMessage.textContent = "Fetching live weather...";

        const currentURL =
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;

        const forecastURL =
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,surface_pressure,visibility&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&forecast_days=7`;

        const airURL =
            `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10`;

        const [currentResponse, forecastResponse, airResponse] =
            await Promise.all([
                fetch(currentURL),
                fetch(forecastURL),
                fetch(airURL)
            ]);

        if (!currentResponse.ok) {
            throw new Error("Unable to fetch current weather.");
        }

        if (!forecastResponse.ok) {
            throw new Error("Unable to fetch forecast.");
        }

        if (!airResponse.ok) {
            throw new Error("Unable to fetch air quality.");
        }

        const current = await currentResponse.json();
        const forecast = await forecastResponse.json();
        const air = await airResponse.json();

        renderCurrentWeather(current, locationName);
        renderHourlyForecast(forecast);
        renderWeeklyForecast(forecast);
        renderAirQuality(air);
        generateSuggestions(current, forecast, air);

        statusMessage.textContent = "Weather information updated successfully.";

    } catch (error) {
        statusMessage.textContent = error.message;
    }
}

// ======================================
// 4. CURRENT WEATHER
// ======================================

function renderCurrentWeather(data, locationName) {

    document.getElementById("cityName").textContent = locationName;

    document.getElementById("temperature").textContent =
        Math.round(data.main.temp) + "°";

    document.getElementById("weatherDescription").textContent =
        data.weather[0].description;

    document.getElementById("weatherIcon").src =
        `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

    document.getElementById("feelsLike").textContent =
        `Feels like ${Math.round(data.main.feels_like)}°C`;

    document.getElementById("humidity").textContent =
        data.main.humidity + "%";

    document.getElementById("windSpeed").textContent =
        data.wind.speed + " m/s";

    document.getElementById("pressure").textContent =
        data.main.pressure + " hPa";

    document.getElementById("visibility").textContent =
        (data.visibility / 1000).toFixed(1) + " km";
}

// ======================================
// 5. HOURLY FORECAST
// ======================================

function renderHourlyForecast(data) {

    const container = document.getElementById("hourlyForecast");

    container.innerHTML = "";

    const times = data.hourly.time;
    const temperatures = data.hourly.temperature_2m;
    const codes = data.hourly.weather_code;
    const rain = data.hourly.precipitation_probability;

    const now = Date.now();

    const futureHours = times
        .map((time, index) => ({
            time,
            index
        }))
        .filter(item => new Date(item.time).getTime() >= now)
        .slice(0, 8);

    futureHours.forEach(item => {

        const i = item.index;

        const hour = new Date(item.time).toLocaleTimeString(
            "en-US",
            { hour: "numeric", hour12: true }
        );

        const icon = getWeatherIcon(codes[i]);

        const card = document.createElement("div");

        card.className = "hour-card";

        card.innerHTML = `
            <p>${hour}</p>
            <img src="${icon}" alt="Weather">
            <h3>${Math.round(temperatures[i])}°C</h3>
            <p><i class="fa-solid fa-droplet"></i> ${rain[i]}%</p>
        `;

        container.appendChild(card);
    });
}

// ======================================
// 6. WEATHER ICON MAPPING
// ======================================

function getWeatherIcon(code) {

    if (code === 0) {
        return "https://openweathermap.org/img/wn/01d@2x.png";
    }

    if ([1, 2].includes(code)) {
        return "https://openweathermap.org/img/wn/02d@2x.png";
    }

    if (code === 3) {
        return "https://openweathermap.org/img/wn/04d@2x.png";
    }

    if ([45, 48].includes(code)) {
        return "https://openweathermap.org/img/wn/50d@2x.png";
    }

    if ([51, 53, 55, 56, 57].includes(code)) {
        return "https://openweathermap.org/img/wn/09d@2x.png";
    }

    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
        return "https://openweathermap.org/img/wn/10d@2x.png";
    }

    if ([71, 73, 75, 77, 85, 86].includes(code)) {
        return "https://openweathermap.org/img/wn/13d@2x.png";
    }

    if ([95, 96, 99].includes(code)) {
        return "https://openweathermap.org/img/wn/11d@2x.png";
    }

    return "https://openweathermap.org/img/wn/01d@2x.png";
}

// ======================================
// 7. 7-DAY FORECAST
// ======================================

function renderWeeklyForecast(data) {

    const container = document.getElementById("weeklyForecast");

    container.innerHTML = "";

    const days = data.daily.time;

    days.forEach((date, index) => {

        const day = new Date(date + "T12:00:00")
            .toLocaleDateString("en-US", {
                weekday: "long"
            });

        const icon = getWeatherIcon(data.daily.weather_code[index]);

        const max = Math.round(data.daily.temperature_2m_max[index]);
        const min = Math.round(data.daily.temperature_2m_min[index]);

        const row = document.createElement("div");

        row.className = "day-row";

        row.innerHTML = `
            <p>${index === 0 ? "Today" : day}</p>

            <div class="day-weather">
                <img src="${icon}" alt="Weather">
                <p>${weatherCodeDescription(data.daily.weather_code[index])}</p>
            </div>

            <div class="day-temp">
                ${max}° / ${min}°
            </div>
        `;

        container.appendChild(row);
    });
}

// Weather code descriptions
function weatherCodeDescription(code) {

    if (code === 0) return "Clear sky";
    if ([1, 2].includes(code)) return "Partly cloudy";
    if (code === 3) return "Overcast";
    if ([45, 48].includes(code)) return "Foggy";
    if (code >= 51 && code <= 67) return "Drizzle / Rain";
    if (code >= 71 && code <= 77) return "Snow";
    if (code >= 80 && code <= 82) return "Rain showers";
    if (code >= 95) return "Thunderstorm";

    return "Variable weather";
}

// ======================================
// 8. AIR QUALITY INDEX
// ======================================

function renderAirQuality(data) {

    const aqi = data.current.us_aqi;

    if (aqi == null) {
        document.getElementById("aqiValue").textContent = "--";
        document.getElementById("aqiStatus").textContent = "Unavailable";
        document.getElementById("aqiDescription").textContent =
            "Air quality data is currently unavailable.";
        return;
    }

    let status = "";
    let description = "";

    if (aqi <= 50) {
        status = "Good";
        description = "Air quality is satisfactory.";
    } else if (aqi <= 100) {
        status = "Moderate";
        description = "Acceptable air quality for most people.";
    } else if (aqi <= 150) {
        status = "Unhealthy for sensitive groups";
        description = "Sensitive individuals should reduce prolonged outdoor exertion.";
    } else if (aqi <= 200) {
        status = "Unhealthy";
        description = "Consider reducing prolonged outdoor activity.";
    } else if (aqi <= 300) {
        status = "Very Unhealthy";
        description = "Avoid prolonged outdoor exertion.";
    } else {
        status = "Hazardous";
        description = "Avoid outdoor activity where possible.";
    }

    document.getElementById("aqiValue").textContent = aqi;
    document.getElementById("aqiStatus").textContent = status;
    document.getElementById("aqiDescription").textContent =
        `${description} PM2.5: ${data.current.pm2_5 ?? "--"} µg/m³ | PM10: ${data.current.pm10 ?? "--"} µg/m³`;

    document.getElementById("aqiProgress").style.width =
        Math.min((aqi / 300) * 100, 100) + "%";
}

// ======================================
// 9. SMART WEATHER SUGGESTIONS
// ======================================

function generateSuggestions(current, forecast, air) {

    const container = document.getElementById("smartSuggestions");

    container.innerHTML = "";

    const temp = current.main.temp;
    const rain = forecast.hourly.precipitation_probability[0] ?? 0;
    const aqi = air.current.us_aqi;

    const suggestions = [];

    if (temp >= 35) {
        suggestions.push({
            icon: "fa-sun",
            text: "It's very hot! Wear light clothes and stay hydrated."
        });
    } else if (temp <= 12) {
        suggestions.push({
            icon: "fa-snowflake",
            text: "It's cold outside. Consider wearing warm clothes."
        });
    } else {
        suggestions.push({
            icon: "fa-shirt",
            text: "The temperature looks comfortable. Choose comfortable clothing."
        });
    }

    if (rain >= 40) {
        suggestions.push({
            icon: "fa-umbrella",
            text: "Rain is possible. Carry an umbrella before going outside."
        });
    } else {
        suggestions.push({
            icon: "fa-person-walking",
            text: "Rain probability is currently low. Outdoor activities may be suitable."
        });
    }

    if (aqi > 100) {
        suggestions.push({
            icon: "fa-mask-face",
            text: "Air quality is poor. Sensitive individuals should limit outdoor exertion."
        });
    } else {
        suggestions.push({
            icon: "fa-leaf",
            text: "Air quality is relatively good. Enjoy outdoor activities if conditions allow."
        });
    }

    suggestions.forEach(item => {

        const div = document.createElement("div");

        div.className = "suggestion-item";

        const icon = document.createElement("i");
        icon.className = `fa-solid ${item.icon}`;

        const text = document.createElement("span");
        text.textContent = item.text;

        div.append(icon, text);

        container.appendChild(div);
    });
}

// ======================================
// 10. DETECT USER LOCATION
// ======================================

locationBtn.addEventListener("click", () => {

    if (!navigator.geolocation) {
        statusMessage.textContent =
            "Geolocation is not supported by your browser.";
        return;
    }

    statusMessage.textContent = "Detecting your location...";

    navigator.geolocation.getCurrentPosition(

        async position => {

            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            try {

                const url =
                    `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;

                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error("Unable to identify your location.");
                }

                const data = await response.json();

                const locationName = data.length
                    ? `${data[0].name}, ${data[0].country}`
                    : "Your Location";

                await loadWeather(lat, lon, locationName);

            } catch (error) {
                statusMessage.textContent = error.message;
            }
        },

        error => {
            statusMessage.textContent =
                "Location permission denied or unavailable. Please search manually.";
        }
    );
});

// ======================================
// 11. DARK / LIGHT MODE
// ======================================

themeBtn.addEventListener("click", () => {

    document.body.classList.toggle("light-theme");

    const isLight =
        document.body.classList.contains("light-theme");

    themeBtn.innerHTML = isLight
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-solid fa-moon"></i>';
});

// ======================================
// 12. INITIAL WEATHER
// ======================================

searchCity("Lucknow");
