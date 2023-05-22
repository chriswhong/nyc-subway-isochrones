library (gtfsrouter)
packageVersion ("gtfsrouter")
library(lubridate)
library('dplyr')
library('stringr')
library('plyr')

# Pull from the latest MTA subway GTFS release
url <- "http://web.mta.info/developers/data/nyct/subway/google_transit.zip"
f <- "google_transit.zip"
if (!file.exists (f)) download.file (url, destfile = f)

# Extract the feed
gtfs <- extract_gtfs (f, stn_suffixes = c ("N", "S"))

# Buld a timetable
gtfs <- gtfs_timetable (gtfs, day = "Wed")

# Separately extract the feed to access and iterate over the "stops.txt" table
outDir<-"tmp_data"
unzip(f,exdir=outDir)
stops <- read.csv("tmp_data/stops.txt")

# Filter the stops
stops <- filter(stops, !str_detect(stop_id, "(N|S)$"))
stops <- filter(stops, !str_detect(stop_id, "140$"))
stops <- filter(stops, !str_detect(stop_id, "H19$"))
stops <- filter(stops, !str_detect(stop_id, "N12$"))

# print(stops)

# For each stop, determine travel time matrix to all other stops
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
    write.csv(x, paste0("data/durations/",stop_id, ".csv"), row.names=FALSE)
}








# 
