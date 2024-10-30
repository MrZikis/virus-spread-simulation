// DATA v JSON formátu



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
         console.log(id_okresu);
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
