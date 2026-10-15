# Public Services Navigator

A static prototype for exploring demonstration health facilities in Nairobi, Kenya.

## Preview

Once GitHub Pages is enabled for the `main` branch, the preview will be available at:

https://robinmutinda53-droid.github.io/public-services-navigator/

## Important: prototype data

All facilities, contact details, service availability, and sample reports in this project are fictional demonstration data. Do not use them to plan real healthcare or travel. Confirm facility information with an official source.

New community reports and the selected theme are saved in the current browser's local storage. They are not sent to a shared service, so reports submitted by one visitor are not visible to other visitors.

## Run locally

Serve this folder with a static web server (for example, the VS Code Live Server extension) and open the local URL it provides. The interactive map loads Leaflet and OpenStreetMap tiles from the internet. Browser location access requires a secure context such as HTTPS or localhost.

## Current prototype features

- Search facilities by name, area, or service.
- Filter by service and facility type.
- Sort by approximate distance or find facilities near the visitor.
- View facility details and community-report examples.
- Submit browser-local demonstration reports.
- Switch between light and dark themes.
- Cache the static app shell for offline use after the first successful visit.
