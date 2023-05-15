import csv from 'csvtojson'
import turfBuffer from '@turf/buffer'
import turfPoint from 'turf-point'
import turfDissolve from '@turf/dissolve'
import turfTruncate from '@turf/truncate'
import turfIntersect from '@turf/intersect'
import flatten from 'geojson-flatten'
import fs from 'fs'

import nycShorelineClip from './data/nyc-shoreline-clip-multi.json' assert { type: 'json' };


const intersectWithShoreline = (FC) => {
    return flatten({
        type: 'FeatureCollection',
        features: FC.features.map((feature) => {
            let clippedFeature = feature
            try {
                const intersection = turfIntersect(clippedFeature, nycShorelineClip)
                if (intersection) {
                    clippedFeature = intersection
                }
    
            } catch(e) {}
            return clippedFeature
        })
    })
}

export const isochroneFromDuration = async (stop_id) => {
    console.log(`processing ${stop_id}`)
    return new Promise(async (resolve, reject) => {
        // Async / await usage
        const jsonArray = await(await csv().fromFile(`./data/durations/${stop_id}.csv`)).map((d) => {
            return {
                ...d,
                stop_lon: parseFloat(d.stop_lon),
                stop_lat: parseFloat(d.stop_lat),
                duration: parseInt(d.duration)
            }
        })

        const TEN_MINUTES_IN_SECONDS = 600
        const TWENTY_MINUTES_IN_SECONDS = 1200
        const THIRTY_MINUTES_IN_SECONDS = 1800
        const FORTY_MINUTES_IN_SECONDS = 2400

        const groupTimeBreaks = [
            TEN_MINUTES_IN_SECONDS,
            TWENTY_MINUTES_IN_SECONDS,
            THIRTY_MINUTES_IN_SECONDS,
            FORTY_MINUTES_IN_SECONDS
        ]

        const colorBreaks = [
            '#0570b0',
            '#74a9cf',
            '#bdc9e1',
            '#f1eef6'
        ]

        const durationBreaks = [
            '10',
            '20',
            '30',
            '40'
        ]



        const tenMinuteStations = jsonArray.filter(d => d.duration <= TEN_MINUTES_IN_SECONDS)
        const twentyMinuteStations = jsonArray.filter((d) => {
            return d.duration > TEN_MINUTES_IN_SECONDS && d.duration <= TWENTY_MINUTES_IN_SECONDS
        })
        const thirtyMinuteStations = jsonArray.filter((d) => {
            return d.duration > TWENTY_MINUTES_IN_SECONDS && d.duration <= THIRTY_MINUTES_IN_SECONDS
        })
        const fortyMinuteStations = jsonArray.filter((d) => {
            return d.duration > THIRTY_MINUTES_IN_SECONDS && d.duration <= FORTY_MINUTES_IN_SECONDS
        })


        const groupedStations = [
            tenMinuteStations,
            twentyMinuteStations,
            thirtyMinuteStations,
            fortyMinuteStations
        ]

        const theIsochrones = []

        groupedStations.forEach((group, i) => {
            let buffers = []

            group.forEach(({ stop_lon, stop_lat, duration }) => {
                // 10 minutes - duration = leftover seconds to walk
                // leftover seconds to walk / 1.2 m/s = buffer distance
                const leftoverSeconds = groupTimeBreaks[i] - duration
                const bufferInMeters = leftoverSeconds * 1.2
                const bufferInKm = bufferInMeters <= 0 ? 0.01 : bufferInMeters / 1000
                buffers = [
                    ...buffers,
                    turfBuffer(
                        turfPoint([stop_lon, stop_lat]),
                        bufferInKm
                    )
                ]
            })

            // buffer the previous buffer
            if (i > 0) {
                const nextWalkingBuffer = turfBuffer(
                    theIsochrones[i - 1],
                    .720 // 10 minutes walking
                )
                buffers = [
                    ...buffers,
                    ...nextWalkingBuffer.features
                ]
            }




            const FC = {
                type: 'FeatureCollection',
                features: buffers
            }
            const dissovledFC = turfDissolve(FC)

            const clippedFC = intersectWithShoreline(dissovledFC)

            dissovledFC.features = clippedFC.features.map((d) => {
                return {
                    ...d,
                    properties: {
                        fill: colorBreaks[i],
                        duration: durationBreaks[i]
                    }
                }
            })

            theIsochrones.push(dissovledFC)
        })

        // walking = 72 meters/minute
        const arrayOfAllFeatures = theIsochrones.map(d => d.features).reduce((curr, acc) => {
            return [
                ...acc,
                ...curr
            ]
        }, [])

        const consolidatedFC = {
            type: 'FeatureCollection',
            features: arrayOfAllFeatures
        }





        var options = { precision: 5, coordinates: 2 };
        const truncatedFC = turfTruncate(consolidatedFC, options);

        fs.writeFileSync(`./data/isochrones/${stop_id}.geojson`, JSON.stringify(truncatedFC))
        resolve()
    })

}


(async () => {

    const csvFilenames = await fs.readdirSync('./data/durations').map(d => d.split('.')[0])

    for (let i = 0; i < csvFilenames.length; i++) {
        await isochroneFromDuration(csvFilenames[i])
    }

})()
