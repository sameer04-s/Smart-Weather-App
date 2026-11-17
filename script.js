
// ======================================
// SKYCAST - SMART WEATHER APPLICATION
// ======================================

// Paste your NEW API key here
const API_KEY = "f407be531fe38bdb6da4b7e7584b2233";

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
// 2. API KEY VALIDATION
// ======================================

function checkAPIKey() {
    if (!API_KEY || API_KEY === "YOUR_NEW_API_KEY") {
        throw new Error("Please add your OpenWeather API key.");
    }
}


// ======================================
// 3. FETCH API DATA
// ======================================

async function fetchData(url) {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error("Invalid API key or API key not activated.");
        }

        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}


// ======================================
// 4. SEARCH CITY
// ======================================

async function searchCity(city) {

    if (!city.trim()) {
        statusMessage.textContent = "Please enter a city name.";
        return;
    }

    try {
        checkAPIKey();

        statusMessage.textContent = "Searching city...";

        const url =
            `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;

        const data = await fetchData(url);

        if (data.length === 0) {
            throw new Error("City not found. Try another city.");
        }

        const { lat, lon, name, country } = data[0];

        await loadWeather(lat, lon, `${name}, ${country}`);

    } catch (error) {
        statusMessage.textContent = error.message;
        console.error(error);
    }
}


// Search button

searchBtn.addEventListener("click", () => {
    searchCity(cityInput.value);
});


// Enter key search

cityInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        searchCity(cityInput.value);
    }
});


// ======================================
// 5. LOAD ALL WEATHER DATA
// ======================================

async function loadWeather(lat, lon, locationName) {

    try {
        checkAPIKey();

        statusMessage.textContent = "Fetching weather data...";

        const currentURL =
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;

        const forecastURL =
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,surface_pressure,visibility&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&forecast_days=7`;

        const airURL =
            `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10`;

        // Fetch current weather first

        const current = await fetchData(currentURL);

        renderCurrentWeather(current, locationName);

        // Fetch forecast and air quality

        const results = await Promise.allSettled([
            fetchData(forecastURL),
            fetchData(airURL)
        ]);

        let forecast = null;
        let air = null;

        if (results[0].status === "fulfilled") {
            forecast = results[0].value;

            renderHourlyForecast(forecast);
            renderWeeklyForecast(forecast);
        } else {
            document.getElementById("hourlyForecast").textContent =
                "Hourly forecast unavailable.";

            document.getElementById("weeklyForecast").textContent =
                "Weekly forecast unavailable.";
        }

        if (results[1].status === "fulfilled") {
            air = results[1].value;
            renderAirQuality(air);
        } else {
            document.getElementById("aqiValue").textContent = "--";
            document.getElementById("aqiStatus").textContent = "Unavailable";
        }

        if (forecast && air) {
            generateSuggestions(current, forecast, air);
        } else {
            generateBasicSuggestions(current);
        }

        statusMessage.textContent =
            `Weather updated successfully for ${locationName}.`;

    } catch (error) {
        statusMessage.textContent = error.message;
        console.error(error);
    }
}


// ======================================
// 6. CURRENT WEATHER
// ======================================

function renderCurrentWeather(data, locationName) {

    document.getElementById("cityName").textContent =
        locationName;

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
// 7. WEATHER ICON MAPPING
// ======================================

function getWeatherIcon(code) {

    let icon = "01";

    if (code === 0) icon = "01";
    else if ([1, 2].includes(code)) icon = "02";
    else if (code === 3) icon = "04";
    else if ([45, 48].includes(code)) icon = "50";
    else if (code >= 51 && code <= 57) icon = "09";
    else if (code >= 61 && code <= 67) icon = "10";
    else if (code >= 71 && code <= 77) icon = "13";
    else if (code >= 80 && code <= 82) icon = "10";
    else if (code >= 95) icon = "11";

    return `https://openweathermap.org/img/wn/${icon}d@2x.png`;
}


// ======================================
// 8. WEATHER DESCRIPTION
// ======================================

function weatherCodeDescription(code) {

    if (code === 0) return "Clear sky";
    if ([1, 2].includes(code)) return "Partly cloudy";
    if (code === 3) return "Overcast";
    if ([45, 48].includes(code)) return "Foggy";
    if (code >= 51 && code <= 57) return "Drizzle";
    if (code >= 61 && code <= 67) return "Rain";
    if (code >= 71 && code <= 77) return "Snow";
    if (code >= 80 && code <= 82) return "Rain showers";
    if (code >= 95) return "Thunderstorm";

    return "Variable weather";
}


// ======================================
// 9. HOURLY FORECAST
// ======================================

function renderHourlyForecast(data) {

    const container =
        document.getElementById("hourlyForecast");

    container.innerHTML = "";

    const times = data.hourly.time;
    const temperatures = data.hourly.temperature_2m;
    const codes = data.hourly.weather_code;
    const rain = data.hourly.precipitation_probability;

    const currentTime = data.current.time;

    let startIndex = times.findIndex(
        time => time >= currentTime
    );

    if (startIndex === -1) startIndex = 0;

    for (
        let i = startIndex;
        i < Math.min(startIndex + 8, times.length);
        i++
    ) {

        const hour = Number(times[i].slice(11, 13));

        const time = new Date(2000, 0, 1, hour)
            .toLocaleTimeString("en-US", {
                hour: "numeric",
                hour12: true
            });

        const card = document.createElement("div");

        card.className = "hour-card";

        card.innerHTML = `
            <p>${i === startIndex ? "Now" : time}</p>

            <img src="${getWeatherIcon(codes[i])}"
                 alt="Weather">

            <h3>${Math.round(temperatures[i])}°C</h3>

            <p>
                <i class="fa-solid fa-droplet"></i>
                ${rain[i] ?? 0}%
            </p>
        `;

        container.appendChild(card);
    }
}


// ======================================
// 10. 7-DAY FORECAST
// ======================================

function renderWeeklyForecast(data) {

    const container =
        document.getElementById("weeklyForecast");

    container.innerHTML = "";

    data.daily.time.forEach((date, index) => {

        const day = new Date(date + "T12:00:00")
            .toLocaleDateString("en-US", {
                weekday: "long"
            });

        const icon =
            getWeatherIcon(data.daily.weather_code[index]);

        const description =
            weatherCodeDescription(data.daily.weather_code[index]);

        const max =
            Math.round(data.daily.temperature_2m_max[index]);

        const min =
            Math.round(data.daily.temperature_2m_min[index]);

        const row = document.createElement("div");

        row.className = "day-row";

        row.innerHTML = `
            <p>${index === 0 ? "Today" : day}</p>

            <div class="day-weather">
                <img src="${icon}" alt="Weather">
                <p>${description}</p>
            </div>

            <div class="day-temp">
                ${max}° / ${min}°
            </div>
        `;

        container.appendChild(row);
    });
}


// ======================================
// 11. AIR QUALITY INDEX
// ======================================

function renderAirQuality(data) {

    const aqi = data.current.us_aqi;

    if (aqi == null) {
        document.getElementById("aqiValue").textContent = "--";
        document.getElementById("aqiStatus").textContent = "Unavailable";
        document.getElementById("aqiDescription").textContent =
            "Air quality data unavailable.";
        return;
    }

    let status = "";
    let description = "";

    if (aqi <= 50) {
        status = "Good";
        description = "Air quality is satisfactory.";

    } else if (aqi <= 100) {
        status = "Moderate";
        description = "Air quality is acceptable.";

    } else if (aqi <= 150) {
        status = "Unhealthy for sensitive groups";
        description = "Sensitive people should reduce prolonged outdoor activity.";

    } else if (aqi <= 200) {
        status = "Unhealthy";
        description = "Reduce prolonged outdoor activity.";

    } else if (aqi <= 300) {
        status = "Very Unhealthy";
        description = "Avoid prolonged outdoor exertion.";

    } else {
        status = "Hazardous";
        description = "Avoid outdoor activity where possible.";
    }

    document.getElementById("aqiValue").textContent =
        Math.round(aqi);

    document.getElementById("aqiStatus").textContent =
        status;

    document.getElementById("aqiDescription").textContent =
        `${description} PM2.5: ${data.current.pm2_5 ?? "--"} µg/m³ | PM10: ${data.current.pm10 ?? "--"} µg/m³`;

    document.getElementById("aqiProgress").style.width =
        Math.min((aqi / 300) * 100, 100) + "%";
}


// ======================================
// 12. SMART WEATHER SUGGESTIONS
// ======================================

function addSuggestion(container, icon, message) {

    const div = document.createElement("div");

    div.className = "suggestion-item";

    const iconElement = document.createElement("i");
    iconElement.className = `fa-solid ${icon}`;

    const text = document.createElement("span");
    text.textContent = message;

    div.append(iconElement, text);

    container.appendChild(div);
}


function generateBasicSuggestions(current) {

    const container =
        document.getElementById("smartSuggestions");

    container.innerHTML = "";

    const temp = current.main.temp;

    if (temp >= 35) {
        addSuggestion(container, "fa-sun",
            "It is hot. Wear light clothes and stay hydrated.");

    } else if (temp <= 12) {
        addSuggestion(container, "fa-snowflake",
            "It is cold. Consider wearing warm clothes.");

    } else {
        addSuggestion(container, "fa-shirt",
            "The temperature is comfortable. Choose suitable clothing.");
    }
}


function generateSuggestions(current, forecast, air) {

    const container =
        document.getElementById("smartSuggestions");

    container.innerHTML = "";

    const temp = current.main.temp;

    const rain =
        forecast.hourly.precipitation_probability[0] ?? 0;

    const aqi = air.current.us_aqi;

    // Temperature advice

    if (temp >= 35) {
        addSuggestion(container, "fa-sun",
            "It's very hot! Wear light clothes and stay hydrated.");

    } else if (temp <= 12) {
        addSuggestion(container, "fa-snowflake",
            "It's cold outside. Wear warm clothes.");

    } else {
        addSuggestion(container, "fa-shirt",
            "Temperature is comfortable. Choose comfortable clothing.");
    }

    // Rain advice

    if (rain >= 40) {
        addSuggestion(container, "fa-umbrella",
            "Rain is possible. Carry an umbrella.");

    } else {
        addSuggestion(container, "fa-person-walking",
            "Rain probability is low. Outdoor activities may be suitable.");
    }

    // Air quality advice

    if (aqi > 100) {
        addSuggestion(container, "fa-mask-face",
            "Air quality is poor. Sensitive people should limit outdoor activity.");

    } else {
        addSuggestion(container, "fa-leaf",
            "Air quality is relatively good. Enjoy outdoor activities if conditions allow.");
    }
}


// ======================================
// 13. LOCATION DETECTION
// ======================================

locationBtn.addEventListener("click", () => {

    if (!navigator.geolocation) {
        statusMessage.textContent =
            "Geolocation is not supported by your browser.";
        return;
    }

    checkAPIKey();

    statusMessage.textContent =
        "Detecting your location...";

    navigator.geolocation.getCurrentPosition(

        async position => {

            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            try {

                const url =
                    `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;

                const data = await fetchData(url);

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
// 14. DARK / LIGHT MODE
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
// 15. INITIAL WEATHER
// ======================================

searchCity("Lucknow");
