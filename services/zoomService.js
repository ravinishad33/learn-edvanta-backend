const axios = require("axios");
require("dotenv").config();

class ZoomService {
  constructor() {
    this.clientId = process.env.ZOOM_CLIENT_ID;
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET;
    this.accountId = process.env.ZOOM_ACCOUNT_ID;
    this.accessToken = null;
    this.expiryTime = null;
  }

  async getAccessToken() {
    if (!this.clientId || !this.clientSecret || !this.accountId) {
      throw new Error("Zoom credentials missing in environment variables.");
    }

    if (this.accessToken && Date.now() < this.expiryTime) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    try {
      const response = await axios.post(
        `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${this.accountId}`,
        {},
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.expiryTime = Date.now() + (response.data.expires_in - 60) * 1000;
      return this.accessToken;
    } catch (error) {
      console.error("Zoom Auth Error:", error.response?.data || error.message);
      throw new Error("Failed to get Zoom access token. Please check your Zoom credentials.");
    }
  }

  async createMeeting(topic, startTime, duration) {
    const token = await this.getAccessToken();
    try {
      const response = await axios.post(
        "https://api.zoom.us/v2/users/me/meetings",
        {
          topic,
          type: 2, // Scheduled meeting
          start_time: startTime, // e.g., 2023-11-15T10:00:00Z
          duration,
          timezone: "UTC",
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: false,
            mute_upon_entry: true,
            waiting_room: true,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Zoom Create Meeting Error:", error.response?.data || error.message);
      throw new Error("Failed to create Zoom meeting");
    }
  }

  async deleteMeeting(meetingId) {
    const token = await this.getAccessToken();
    try {
      await axios.delete(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return true;
    } catch (error) {
      console.error("Zoom Delete Meeting Error:", error.response?.data || error.message);
      throw new Error("Failed to delete Zoom meeting");
    }
  }
}

module.exports = new ZoomService();
