// Inicializace mapy - odkazuje na knihovnu Leaflet a následně nastaví střed mapy a zoom
const map = L.map('map').setView([49.75, 15.5], 7);

 // Přidání základní vrstvy mapy
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
 maxZoom: 18,
 // attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

 // Načtení GeoJSON souboru (změň na správnou cestu k tvému souboru)
 fetch('./okresy.geojson')
 .then(response => response.json())
 .then(data => {
 // Přidání GeoJSON do mapy
 L.geoJSON(data, {
     onEachFeature: function(feature, layer) {
         // Přidejte CSS třídu pro každý okres
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
let population_max;

async function initializeData() {
    try {
        const response = await fetch('./data_okresy.json');
        districts = await response.json();

        // TODO: bude to čerpat ze souboru a přidá to tu položku susceptible
        for (const district in districts) {
            districts[district]["susceptible"] =
                districts[district]["population"] - districts[district]["infected"];
        }

        population_max = Math.max(
            ...Object.values(districts).map((d) => d.population)
        );

        // Jakmile jsou data načtena, můžeme pokračovat
        console.log("Načtená data:", districts);
    } catch (error) {
        console.error("Chyba při načítání JSON:", error);
    }
}

initializeData();

for (let i = 0; i < 100; i++) {
    console.log(Math.random());
}

function vypsatData() {
    console.log(districts);
}

// TODO: bude se moct následně nastavovat přímo z webu (zadáním, posuvníkem)
// Parametry modelu
const beta_intra = 0.3; // pravděpodobnost přenosu nemoci mezi lidmi v jednom místě
const theta = 0.05; //pravděpodobnost přenosu mezi sousedními okresy
const beta_exponent = 1; // Citlivost meziokresního přenosu na velikost obyvatelstva
const non_neighbor_transmission_chance = 0.001; // Přenos mezi nesousedícími okresy
const num_days = 150; // počet dní simulace

console.log("populace max: " + population_max);


// TODO: vylepšit ať to jede dokud se nezaplní celá republika
// TODO: uživatel bude moci zastavit a zase spustit simulaci
// Simulování šíření nemoci
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

        // Vyjádření kolik nových lidí se v okrese infikuje
        const delta_I_intra = (beta_intra * S_i * I_i) / N_i;

        // TODO: Nejsou zaimplementované sousední okresy, teprve až budou data
        // Vypočtení kolik lidí se infikuje ze sousedních okresů
        let delta_I_inter = 0;
        // data.neighbors.forEach((neighbor) => {
        //     const neighborData = districts[neighbor];
        //     const I_j = neighborData.infected;
        //     const N_j = neighborData.population;
        //
        //     // Výpočet kolik lidí se infikuje z tohoto sous ()
        //     const delta_I_ji =
        //         theta * (N_j / population_max) ** beta_exponent * (I_j / N_j) * S_i;
        //     delta_I_inter += delta_I_ji;
        // });

        for (const non_neighbor in districts) {
            if (
                // !data.neighbors.includes(non_neighbor) &&
                Math.random() < non_neighbor_transmission_chance
            ) {
                console.log("snažím se infikovat do jiného okresu");
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
        const districtName = districts[district].name;
        resultsDiv.innerHTML += `<p>${districtName} - Neinfikovaných: ${districtData.susceptible}, Infikovaných: ${districtData.infected}</p>`;
    }
}

// Vykreslení bodů na mapě
function updateMap() {
    for (const district in districts) {
        const data = districts[district];
        const reddish = data.infected / data.population;
        document
            .querySelector(`.okres-${district}`)
            .setAttribute(
                "style",
                `fill: rgba(255, 0, 0, ${reddish}); fill-opacity: 0.7`
            );
    }
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
            button.innerText = isPaused ? "Pokračovat" : "Pauza";
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

