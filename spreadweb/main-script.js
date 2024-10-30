// DATA v JSON form�tu



// Inicializace mapy - odkazuje na knihovnu Leaflet a n�sledn� nastav� st�ed mapy a zoom
const map = L.map('map').setView([49.75, 15.5], 7);

 // P�id�n� z�kladn� vrstvy mapy
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
 maxZoom: 18,
 // attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

 // Na�ten� GeoJSON souboru (zm�� na spr�vnou cestu k tv�mu souboru)
 fetch('./okresy.geojson')
 .then(response => response.json())
 .then(data => {
 // P�id�n� GeoJSON do mapy
 L.geoJSON(data, {
     onEachFeature: function(feature, layer) {
         // P�idejte CSS t��du pro ka�d� okres
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
