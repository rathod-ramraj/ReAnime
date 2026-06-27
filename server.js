const { createApp } = require('./app');

const PORT = process.env.PORT || 8765;
const app = createApp();

app.listen(PORT, () => {
  console.log(`ReAnime running at http://localhost:${PORT}`);
  console.log('API: /api/search  /api/resolve/mal/:id  /api/resolve/series/:id');
});
