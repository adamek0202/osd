const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');

// Inicializace Express serveru
const app = express();
const PORT = 8080;

// Skladování objednávek
let orders = { preparing: [], finished: [] };

// Middleware pro parsování JSON
app.use(express.json());

// Statické soubory (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint pro přidání nové objednávky
app.post('/new-order', (req, res) => {
  const { orderId } = req.body;
  if (orderId && !orders.preparing.includes(orderId)) {
    orders.preparing.push(orderId);

    // Oznámení všem WebSocket klientům
    broadcast({ action: 'new_order', orderId });

    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, message: 'Invalid orderId or duplicate' });
  }
});

// Vytvoření HTTP serveru
const server = app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});

// WebSocket server
const wss = new WebSocketServer({ server });

// Odesílání zpráv všem WebSocket klientům
function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}

// Zpracování WebSocket připojení
wss.on('connection', (ws) => {
  console.log('Nový WebSocket klient připojen.');

  // Při připojení pošleme aktuální stav objednávek
  ws.send(JSON.stringify({ action: 'update_orders', orders }));

  // Zpracování zpráv od klientů
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.action === 'move_to_finished') {
      const index = orders.preparing.indexOf(data.orderId);
      if (index !== -1) {
        orders.preparing.splice(index, 1);
        orders.finished.push(data.orderId);
        broadcast({ action: 'order_finished', orderId: data.orderId });
      }
    } else if (data.action === 'remove_order') {
      const index = orders.finished.indexOf(data.orderId);
      if (index !== -1) {
        orders.finished.splice(index, 1);
        broadcast({ action: 'order_removed', orderId: data.orderId });
      }
    }
  });

  ws.on('close', () => {
    console.log('WebSocket klient odpojen.');
  });
});
