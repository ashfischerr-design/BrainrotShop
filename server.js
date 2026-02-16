const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(bodyParser.json());

mongoose.connect('<YOUR_MONGODB_URI>', { useNewUrlParser: true, useUnifiedTopology: true });

const ItemSchema = new mongoose.Schema({ name: String, price: Number, image: String });
const MessageSchema = new mongoose.Schema({ from: String, to: String, text: String, itemId: Number, payment: String, timestamp: Date });
const UserSchema = new mongoose.Schema({ username: String, password: String });

const Item = mongoose.model('Item', ItemSchema);
const Message = mongoose.model('Message', MessageSchema);
const User = mongoose.model('User', UserSchema);

// Routes
app.get('/items', async (req, res) => res.json(await Item.find()));
app.post('/items', async (req, res) => {
  const item = new Item(req.body);
  await item.save();
  io.emit('updateItems'); // Notify all clients
  res.json(item);
});
app.delete('/items/:id', async (req, res) => {
  await Item.findByIdAndDelete(req.params.id);
  io.emit('updateItems');
  res.sendStatus(200);
});

app.get('/messages/:user', async (req, res) => res.json(await Message.find({ $or: [{ from: req.params.user }, { to: req.params.user }] })));
app.post('/messages', async (req, res) => {
  const msg = new Message(req.body);
  await msg.save();
  io.emit('updateMessages', req.body.to); // Notify recipient
  res.json(msg);
});

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (await User.findOne({ username })) return res.status(400).json({ error: 'Username taken' });
  const user = new User({ username, password });
  await user.save();
  res.json({ success: true });
});
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) res.json({ success: true });
  else res.status(401).json({ error: 'Invalid credentials' });
});

io.on('connection', (socket) => {
  console.log('User connected');
});

server.listen(3000, () => console.log('Server running on port 3000'));