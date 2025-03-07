const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// データベース接続部分を変更
const dbPath = process.env.NODE_ENV === 'production' 
    ? './tmp/reservations.db' 
    : './reservations.db';

// データベース接続前にディレクトリ作成を確認
const fs = require('fs');
const path = require('path');

if (process.env.NODE_ENV === 'production') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

const db = new sqlite3.Database(dbPath, (err) => {
    // 以下は元のままでOK
});

// ルート
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 予約可能な時間枠を取得するAPI
app.get('/api/available-slots', (req, res) => {
    const { date } = req.query;
    
    if (!date) {
        return res.status(400).json({ error: '日付が指定されていません' });
    }
    
    // 指定された日付の予約済み時間枠を取得
    db.all('SELECT time FROM reservations WHERE date = ? AND status != "cancelled"', [date], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // 予約済み時間枠
        const bookedSlots = rows.map(row => row.time);
        
        // 営業時間: 17:00-21:00、30分ごと
        const allSlots = [];
        for (let hour = 17; hour < 21; hour++) {
            for (let minute of [0, 30]) {
                allSlots.push(`${hour}:${minute === 0 ? '00' : minute}`);
            }
        }
        
        // 利用可能な時間枠 = 全時間枠 - 予約済み時間枠
        const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
        
        res.json({ availableSlots });
    });
});

// 新規予約作成API
app.post('/api/reservations', (req, res) => {
    const { name, email, phone, people, date, time, notes } = req.body;
    
    if (!name || !email || !phone || !people || !date || !time) {
        return res.status(400).json({ error: '必須項目が不足しています' });
    }
    
    // 指定された時間枠が既に予約されていないか確認
    db.get('SELECT id FROM reservations WHERE date = ? AND time = ? AND status != "cancelled"', [date, time], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (row) {
            return res.status(409).json({ error: '指定された時間枠は既に予約されています' });
        }
        
        // 予約を作成
        const sql = `
            INSERT INTO reservations (name, email, phone, people, date, time, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(sql, [name, email, phone, people, date, time, notes], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // 作成された予約のIDを返す
            res.status(201).json({
                message: '予約が作成されました',
                id: this.lastID
            });
            
            // TODO: 確認メールを送信する処理
        });
    });
});

// 予約一覧取得API
app.get('/api/reservations', (req, res) => {
    const { date, status } = req.query;
    
    let sql = 'SELECT * FROM reservations';
    const params = [];
    
    // フィルタ条件を追加
    if (date || status) {
        sql += ' WHERE';
        
        if (date) {
            sql += ' date = ?';
            params.push(date);
        }
        
        if (status && date) {
            sql += ' AND status = ?';
            params.push(status);
        } else if (status) {
            sql += ' status = ?';
            params.push(status);
        }
    }
    
    sql += ' ORDER BY date ASC, time ASC';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ reservations: rows });
    });
});

// 特定の予約を取得するAPI
app.get('/api/reservations/:id', (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM reservations WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!row) {
            return res.status(404).json({ error: '予約が見つかりません' });
        }
        
        res.json({ reservation: row });
    });
});

// 予約を更新するAPI
app.put('/api/reservations/:id', (req, res) => {
    const { id } = req.params;
    const { name, email, phone, people, date, time, notes, status } = req.body;
    
    if (!name || !email || !phone || !people || !date || !time || !status) {
        return res.status(400).json({ error: '必須項目が不足しています' });
    }
    
    // 日時が変更された場合、その時間枠が利用可能か確認
    db.get('SELECT id FROM reservations WHERE id != ? AND date = ? AND time = ? AND status != "cancelled"', [id, date, time], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (row) {
            return res.status(409).json({ error: '指定された時間枠は既に予約されています' });
        }
        
        // 予約を更新
        const sql = `
            UPDATE reservations
            SET name = ?, email = ?, phone = ?, people = ?, date = ?, time = ?, notes = ?, status = ?
            WHERE id = ?
        `;
        
        db.run(sql, [name, email, phone, people, date, time, notes, status, id], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: '予約が見つかりません' });
            }
            
            res.json({
                message: '予約が更新されました',
                id: id
            });
        });
    });
});

// 予約をキャンセルするAPI
app.patch('/api/reservations/:id/cancel', (req, res) => {
    const { id } = req.params;
    
    db.run('UPDATE reservations SET status = "cancelled" WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: '予約が見つかりません' });
        }
        
        res.json({
            message: '予約がキャンセルされました',
            id: id
        });
    });
});

// サーバー起動
app.listen(port, () => {
    console.log(`サーバーが起動しました: http://localhost:${port}`);
});

// アプリケーション終了時にデータベース接続を閉じる
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('データベース接続終了エラー:', err.message);
        } else {
            console.log('データベース接続を閉じました');
        }
        process.exit(0);
    });
});
