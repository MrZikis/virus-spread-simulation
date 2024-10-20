let isPaused = false;
let isRunning = false;
let currentDay = 0;
let intervalId;

const map = L.map("map").setView([49.8175, 15.473], 7);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const districts = {
  "Plzeň-město": {
    population: 169033,
    infected: 0,
    coords: [49.7384, 13.3736],
    neighbors: ["Plzeň-jih", "Plzeň-sever"],
  },
  "Plzeň-jih": {
    population: 63852,
    infected: 0,
    coords: [49.6116, 13.4858],
    neighbors: ["Plzeň-město", "Plzeň-sever", "Rokycany", "Klatovy"],
  },
  "Plzeň-sever": {
    population: 79527,
    infected: 0,
    coords: [49.8533, 13.3693],
    neighbors: ["Plzeň-město", "Plzeň-jih", "Rokycany", "Tachov"],
  },
  Klatovy: {
    population: 86542,
    infected: 0,
    coords: [49.3954, 13.2957],
    neighbors: ["Plzeň-jih", "Domažlice"],
  },
  Domažlice: {
    population: 60930,
    infected: 0,
    coords: [49.4403, 12.9303],
    neighbors: ["Klatovy", "Tachov"],
  },
  Rokycany: {
    population: 47175,
    infected: 0,
    coords: [49.7422, 13.5942],
    neighbors: ["Plzeň-jih", "Plzeň-sever"],
  },
  Tachov: {
    population: 34943,
    infected: 10,
    coords: [49.7956, 12.6309],
    neighbors: ["Plzeň-sever", "Domažlice"],
  },
};

for (const district in districts) {
  districts[district]["susceptible"] =
    districts[district]["population"] - districts[district]["infected"];
}

const beta_intra = 0.3;
const theta = 0.05;
const beta_exponent = 1;
const non_neighbor_transmission_chance = 0.01;
const population_max = Math.max(
  ...Object.values(districts).map((d) => d.population)
);
const num_days = 50;

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
    const data = districts[district];
    const S_i = data.susceptible;
    const I_i = data.infected;
    const N_i = data.population;

    const delta_I_intra = (beta_intra * S_i * I_i) / N_i;

    let delta_I_inter = 0;
    data.neighbors.forEach((neighbor) => {
      const neighborData = districts[neighbor];
      const I_j = neighborData.infected;
      const N_j = neighborData.population;

      const delta_I_ji =
        theta * (N_j / population_max) ** beta_exponent * (I_j / N_j) * S_i;
      delta_I_inter += delta_I_ji;
    });

    for (const non_neighbor in districts) {
      if (
        !data.neighbors.includes(non_neighbor) &&
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

function displayResults(dayResult) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = `<h3>Den ${dayResult.day}</h3>`;
  for (const district in districts) {
    const districtData = dayResult[district];
    resultsDiv.innerHTML += `<p>${district}: Neinfikovaných: ${districtData.susceptible}, Infikovaných: ${districtData.infected}</p>`;
  }
}

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
