const PORT = 5000


const server = require('./app')

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
