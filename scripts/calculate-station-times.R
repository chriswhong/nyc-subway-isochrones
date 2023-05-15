library (gtfsrouter)
packageVersion ("gtfsrouter")
library(lubridate)
library('dplyr')
library('stringr')
library('plyr')

gtfs <- extract_gtfs (
    filename="/Users/chriswhong/Sites/gtfs-tinker/data/google_transit.zip",
    stn_suffixes = c ("N", "S")
)

gtfs <- gtfs_timetable (gtfs, day = "Wed")


stops <- read.csv("/Users/chriswhong/Sites/gtfs-tinker/data/google_transit/stops.txt")

stops <- filter(stops, !str_detect(stop_id, "(N|S)$"))
stops <- filter(stops, !str_detect(stop_id, "140$"))
stops <- filter(stops, !str_detect(stop_id, "H19$"))
stops <- filter(stops, !str_detect(stop_id, "N12$"))

# print(stops)

for (stop_id in stops$stop_id) {
    print(paste0('Processing data for stop ', stop_id))
    x <- gtfs_traveltimes (
        gtfs,
        from = stop_id,
        from_is_id = TRUE,
        start_time_limits = c (12, 14) * 3600,
        max_traveltime = 60 * 60 * 4,
    )
    x$duration <- period_to_seconds(hms(x$duration))
    write.csv(x, paste0("/Users/chriswhong/Sites/gtfs-tinker/data/durations/",stop_id, ".csv"), row.names=FALSE)
  
}








# 
