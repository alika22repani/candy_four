from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Biar frontend bisa akses backend dari localhost

# Konfigurasi database
DATABASE = 'games.db'

def get_db():
    """Koneksi ke database SQLite"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row  # Biar hasil query bisa diakses seperti dictionary
    return conn

def init_db():
    """Buat tabel riwayat game kalo belum ada"""
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS game_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_mode TEXT NOT NULL,
            winner TEXT NOT NULL,
            node_count INTEGER NOT NULL,
            ai_depth INTEGER,
            algorithm_used TEXT,
            played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()
    print("✅ Database initialized!")

# Init database saat pertama kali file ini dijalankan
init_db()

# ==================== API ENDPOINTS ====================

@app.route('/')
def home():
    """Halaman utama API (cek apakah backend jalan)"""
    return jsonify({
        'message': '🎮 Candy Connect Four API is running!',
        'status': 'active',
        'endpoints': {
            'GET /api/games': 'Ambil semua riwayat game',
            'POST /api/games': 'Simpan hasil game baru',
            'DELETE /api/games/<id>': 'Hapus riwayat tertentu',
            'GET /api/stats': 'Ambil statistik ringkas'
        }
    })

@app.route('/api/games', methods=['GET'])
def get_games():
    """Ambil semua riwayat game (10 terakhir)"""
    try:
        conn = get_db()
        games = conn.execute('''
            SELECT * FROM game_history 
            ORDER BY played_at DESC 
            LIMIT 10
        ''').fetchall()
        conn.close()
        
        # Convert ke list of dictionaries
        result = []
        for game in games:
            result.append({
                'id': game['id'],
                'game_mode': game['game_mode'],
                'winner': game['winner'],
                'node_count': game['node_count'],
                'ai_depth': game['ai_depth'],
                'algorithm_used': game['algorithm_used'],
                'played_at': game['played_at']
            })
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/games', methods=['POST'])
def save_game():
    """Simpan hasil game selesai"""
    try:
        data = request.get_json()
        
        # Validasi required fields
        required_fields = ['game_mode', 'winner', 'node_count']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing field: {field}'}), 400
        
        conn = get_db()
        conn.execute('''
            INSERT INTO game_history (game_mode, winner, node_count, ai_depth, algorithm_used)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            data['game_mode'],
            data['winner'],
            data['node_count'],
            data.get('ai_depth'),  # Bisa None kalo mode human
            data.get('algorithm_used')  # Bisa None kalo mode human
        ))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Game saved successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/games/<int:game_id>', methods=['DELETE'])
def delete_game(game_id):
    """Hapus riwayat tertentu (opsional)"""
    try:
        conn = get_db()
        conn.execute('DELETE FROM game_history WHERE id = ?', (game_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'message': f'Game {game_id} deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Ambil statistik ringkas"""
    try:
        conn = get_db()
        
        # Total game
        total = conn.execute('SELECT COUNT(*) as total FROM game_history').fetchone()['total']
        
        # Player 1 win count
        player_wins = conn.execute(
            'SELECT COUNT(*) as count FROM game_history WHERE winner = ?', 
            ('player1',)
        ).fetchone()['count']
        
        # Player 2 / AI win count
        ai_wins = conn.execute(
            'SELECT COUNT(*) as count FROM game_history WHERE winner = ?',
            ('player2',)
        ).fetchone()['count']
        
        # Draw count
        draws = conn.execute(
            'SELECT COUNT(*) as count FROM game_history WHERE winner = ?',
            ('draw',)
        ).fetchone()['count']
        
        conn.close()
        
        return jsonify({
            'total_games': total,
            'player_wins': player_wins,
            'ai_wins': ai_wins,
            'draws': draws
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== JALANKAN SERVER ====================
if __name__ == '__main__':
    print("🎮 Starting Candy Connect Four Backend...")
    print("📍 Server running at: http://127.0.0.1:5000")
    print("📋 API endpoints:")
    print("   - GET  /api/games  (lihat riwayat)")
    print("   - POST /api/games  (simpan game)")
    print("   - GET  /api/stats  (lihat statistik)")
    print("=" * 50)
   
    port = int(os.environ.get('PORT', 5000))  # Railway kasih PORT otomatis
    app.run(host='0.0.0.0', port=port, debug=False)