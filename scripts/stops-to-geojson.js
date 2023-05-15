import csv from 'csvtojson'
import fs from 'fs'

(async() => {
    let stops = await csv().fromFile(`./data/google_transit/stops.txt`)

    // filter out suffixes 
    stops = stops.filter(d => !d.stop_id.match(/(N|S)$/))

    const FC = {
        type: 'FeatureCollection',
        features: stops.map((d) => {
            return {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [parseFloat(d.stop_lon), parseFloat(d.stop_lat)]
                },
                properties: {
                    stop_id: d.stop_id,
                    stop_name: d.stop_name
                }
            }
        })
    }

    fs.writeFileSync('./data/stops.geojson', JSON.stringify(FC))
})()