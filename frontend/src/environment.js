let IS_PROD = true;
const server = IS_PROD
  ? "https://deploylinkup-3.onrender.com"
  : "http://localhost:8000";


export default server;
