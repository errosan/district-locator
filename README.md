# <img src="https://user-images.githubusercontent.com/19228647/91252403-68173380-e712-11ea-8adb-6ddab9f81739.png" width="317" height="52" alt="district-locator">
This is a concept for how to obtain school and legislative districts that serve a given address using district boundary maps.

<img src="https://user-images.githubusercontent.com/19228647/91251373-25ecf280-e710-11ea-8b26-1361c8107a7b.png" style="width:100%; max-width:891px; height: auto" alt="Screenshot of district locator">

## Getting Started
You can build and run this app on any system that is running NodeJS (Windows, MacOS, etc.). Follow these steps to get, build and run this app.

```bash
git clone https://github.com/errosan/district-locator.git
cd district-locator
npm install
npm start
```

Once started, navigate to <http://localhost:3000> using your favorite web browser. The web page will attempt to get your location automatically using the Geolocation Web API. This requires your permission and a secure connection. Some browsers will allow Geolcation API calls over insecure localhost connections, some will not, YMMV.

## Additional Info
You will need to edit ```public/index.html``` and add your Google API key to the Google API JavaScript URL.

Currently, the website will not function because the private database is behind a firewall. In the near future I will be publishing the database to Github so that the website will be functional out-of-the-box.
