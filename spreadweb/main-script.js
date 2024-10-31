// Inicializace mapy - odkazuje na knihovnu Leaflet a následnì nastaví støed mapy a zoom
const map = L.map('map').setView([49.75, 15.5], 7);

 // Pøidání základní vrstvy mapy
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
 maxZoom: 18,
 // attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

 // Naètení GeoJSON souboru (zmìò na správnou cestu k tvému souboru)
 fetch('./okresy.geojson')
 .then(response => response.json())
 .then(data => {
 // Pøidání GeoJSON do mapy
 L.geoJSON(data, {
     onEachFeature: function(feature, layer) {
         // Pøidejte CSS tøídu pro každý okres
         const id_okresu = feature.properties.id.slice(0,6);
         if (feature.properties.id) {
             layer.options.className = 'okres-' + id_okresu;
         }
     },
     style: function(feature) {
         return {
             color: '#000000',
             weight: 1,
             fillOpacity: 0,
         };
     }
 }).addTo(map);
});


 // simulace
let isPaused = false;
let isRunning = false;
let currentDay = 0;
let intervalId;

let districts = {};

async function initializeData() {
    try {
        const response = await fetch('./data_okresy.json');
        districts = await response.json();

        // TODO: bude to èerpat ze souboru a pøidá to tu položku susceptible
        for (const district in districts) {
            districts[district]["susceptible"] =
                districts[district]["population"] - districts[district]["infected"];
        }

        // Jakmile jsou data naètena, mùžeme pokraèovat
        console.log("Naètená data:", districts);
    } catch (error) {
        console.error("Chyba pøi naèítání JSON:", error);
    }
}

initializeData();

function vypsatData() {
    console.log(districts);
}

// TODO: bude se moct následnì nastavovat pøímo z webu (zadáním, posuvníkem)
// Parametry modelu
const beta_intra = 0.3; // pravdìpodobnost pøenosu nemoci mezi lidmi v jednom místì
const theta = 0.05; //pravdìpodobnost pøenosu mezi sousedními okresy
const beta_exponent = 1; // Citlivost meziokresního pøenosu na velikost obyvatelstva
const non_neighbor_transmission_chance = 0.01; // Pøenos mezi nesousedícími okresy
const population_max = Math.max(
    ...Object.values(districts).map((d) => d.population)
); // Nalezení nejvìtšího poètu obyvatel v okresech
const num_days = 50; // poèet dní simulace


// TODO: vylepšit a to jede dokud se nezaplní celá republika
// TODO: uživatel bude moci zastavit a zase spustit simulaci
// Simulování šíøení nemoci
function simulate() {
    if (isRunning) return;
    isRunning = true;
    currentDay = 0;

    intervalId = setInterval(() => {
        if (isPaused) return;

        if (currentDay < num_days) {
            updateSimulationDay();
            updateMap();
            currentDay++;
        } else {
            clearInterval(intervalId);
            isRunning = false;
            document.getElementById("start-simulation").innerText = "Restart";
        }
    }, 1000);
}



function updateSimulationDay() {
    const newValues = {};
    const dayResults = { day: currentDay + 1 };

    for (const district in districts) {
        // Vezmeš si data o tom okresu
        const data = districts[district];
        const S_i = data.susceptible;
        const I_i = data.infected;
        const N_i = data.population;

        // Vyjádøení kolik nových lidí se v okrese infikuje
        const delta_I_intra = (beta_intra * S_i * I_i) / N_i;

        // TODO: Nejsou zaimplementované sousední okresy, teprve až budou data
        // Vypoètení kolik lidí se infikuje ze sousedních okresù
        let delta_I_inter = 0;
        // data.neighbors.forEach((neighbor) => {
        //     const neighborData = districts[neighbor];
        //     const I_j = neighborData.infected;
        //     const N_j = neighborData.population;
        //
        //     // Výpoèet kolik lidí se infikuje z tohoto sous ()
        //     const delta_I_ji =
        //         theta * (N_j / population_max) ** beta_exponent * (I_j / N_j) * S_i;
        //     delta_I_inter += delta_I_ji;
        // });

        for (const non_neighbor in districts) {
            if (
                // !data.neighbors.includes(non_neighbor) &&
                Math.random() < non_neighbor_transmission_chance
            ) {
                const nonNeighborData = districts[non_neighbor];
                const I_j = nonNeighborData.infected;
                const N_j = nonNeighborData.population;

                const delta_I_ji =
                    theta * (N_j / population_max) ** beta_exponent * (I_j / N_j) * S_i;
                delta_I_inter += delta_I_ji;
            }
        }

        const delta_I_total = Math.min(delta_I_intra + delta_I_inter, S_i);

        newValues[district] = {
            susceptible: S_i - delta_I_total,
            infected: I_i + delta_I_total,
        };

        dayResults[district] = {
            susceptible: Math.round(S_i - delta_I_total),
            infected: Math.round(I_i + delta_I_total),
        };
    }

    for (const district in newValues) {
        districts[district].susceptible = newValues[district].susceptible;
        districts[district].infected = newValues[district].infected;
    }

    displayResults(dayResults);
}


// Vypsání aktuálního stavu simulace
function displayResults(dayResult) {
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = `<h3>Den ${dayResult.day}</h3>`;
    for (const district in districts) {
        const districtData = dayResult[district];
        resultsDiv.innerHTML += `<p>${district}: Neinfikovaných: ${districtData.susceptible}, Infikovaných: ${districtData.infected}</p>`;
    }
}

// Vykreslení bodù na mapì
function updateMap() {
    if (window.markers) {
        window.markers.forEach((marker) => map.removeLayer(marker));
    }
    window.markers = [];

    Object.keys(districts).forEach((district) => {
        const data = districts[district];
        const numDots = Math.floor(data.infected / 10);

        for (let i = 0; i < numDots; i++) {
            const randomLat = data.coords[0] + (Math.random() * 0.05 - 0.1);
            const randomLng = data.coords[1] + (Math.random() * 0.05 - 0.1);

            const marker = L.circleMarker([randomLat, randomLng], {
                radius: 5,
                color: "red",
                fillColor: "red",
                fillOpacity: 0.8,
            }).addTo(map);

            window.markers.push(marker);
        }
    });
}

document
    .getElementById("start-simulation")
    .addEventListener("click", function () {
        const button = document.getElementById("start-simulation");

        if (button.innerText === "Spustit simulaci") {
            button.innerText = "Pauza";
            simulate();
        } else if (button.innerText === "Pauza") {
            isPaused = !isPaused;
            button.innerText = isPaused ? "Pokraèovat" : "Pauza";
        } else if (button.innerText === "Restart") {
            clearInterval(intervalId);
            isRunning = false;
            resetSimulation();
            button.innerText = "Spustit simulaci";
        }
    });

function resetSimulation() {
    currentDay = 0;
    Object.keys(districts).forEach((district) => {
        districts[district].infected = 0;
        districts[district].susceptible = districts[district].population;
    });
    document.getElementById("results").innerHTML = "";
    updateMap();
}

