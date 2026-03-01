const axios = require("axios");

const getLocationFromIP = async (ip) => {
  try {
    const response = await axios.get(`https://ipapi.co/${ip}/json/`);
    const { city, region, country_name } = response.data;
    return `${city || "Unknown City"}, ${region || "Unknown Region"}, ${country_name || "Unknown Country"}`;
  } catch (error) {
    console.error("GeoIP lookup failed:", error.message);
    return "Unknown Location";
  }
};
module.exports={getLocationFromIP}