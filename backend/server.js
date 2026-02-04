const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// FIX BUG #1: Cập nhật password khớp với docker-compose
const pool = new Pool({
   user: process.env.DB_USER || 'postgres',
   host: process.env.DB_HOST || 'localhost', 
   database: process.env.DB_NAME || 'tododb',
   password: process.env.DB_PASSWORD || 'postgres',
   port: process.env.DB_PORT || 5432,
});

app.get('/health', (req, res) => {
   res.json({ status: 'healthy', version: '1.0.0' });
});

// GET todos
app.get('/api/todos', async (req, res) => {
   try {
      const result = await pool.query('SELECT * FROM todos ORDER BY id');
      res.json(result.rows);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

// FIX BUG #2: Thêm validation để kiểm tra title trống
app.post('/api/todos', async (req, res) => {
   try {
      const { title, completed = false } = req.body;

      // Kiểm tra nếu title không tồn tại hoặc chỉ toàn khoảng trắng
      if (!title || title.trim() === '') {
         return res.status(400).json({ error: "Title is required and cannot be empty" });
      }

      const result = await pool.query(
         'INSERT INTO todos(title, completed) VALUES($1, $2) RETURNING *',
         [title, completed]
      );
      res.status(201).json(result.rows[0]);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

// BUG #3: Implement DELETE
app.delete('/api/todos/:id', async (req, res) => {
   const { id } = req.params;

   if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
   }

   try {
      const result = await pool.query('DELETE FROM todos WHERE id = $1 RETURNING *', [id]);
      
      if (result.rowCount === 0) {
         return res.status(404).json({ error: "Cannot find todo with ID " + id + " to delete" });
      }
      
      res.status(200).json({ 
         message: "Todo deleted successfully", 
         deletedId: id 
      });
   } catch (err) {
      console.error("Error DELETE:", err.message);
      res.status(500).json({ error: "Internal server error" });
   }
});

// BUG #4: Implement PUT
app.put('/api/todos/:id', async (req, res) => {
   const { id } = req.params;
   const { title, completed } = req.body;

   if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
   }

   try {
      const query = `
         UPDATE todos 
         SET 
            title = COALESCE($1, title), 
            completed = COALESCE($2, completed) 
         WHERE id = $3 
         RETURNING *`;
      
      const result = await pool.query(query, [title, completed, id]);

      if (result.rowCount === 0) {
         return res.status(404).json({ error: "Cannot find todo with ID " + id + " to update" });
      }

      res.json(result.rows[0]);
   } catch (err) {
      console.error("Error PUT:", err.message);
      res.status(500).json({ error: "Cannot update now" });
   }
});

const port = process.env.PORT || 8080;

// FIX BUG #5: Chỉ khởi động server nếu KHÔNG PHẢI môi trường test
if (process.env.NODE_ENV !== 'test') {
   app.listen(port, () => {
      console.log(`Backend running on port ${port}`);
   });
}

// FIX BUG #6: Export app module để các file test có thể sử dụng
module.exports = app;