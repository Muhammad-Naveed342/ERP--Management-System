import psycopg2
from urllib.parse import urlparse

DATABASE_URL = "postgresql://postgres:admin@localhost:5432/business_db"

def fix_db():
    parsed = urlparse(DATABASE_URL)
    conn = psycopg2.connect(
        dbname=parsed.path.lstrip('/'),
        user=parsed.username,
        password=parsed.password,
        host=parsed.hostname,
        port=parsed.port
    )
    conn.autocommit = True
    cur = conn.cursor()
    
    print("Checking for missing columns...")
    
    # Add location to shops table if missing
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='shops' AND column_name='location';")
    if not cur.fetchone():
        print("Adding location to shops table...")
        cur.execute("ALTER TABLE shops ADD COLUMN location VARCHAR(255);")

    # Add synced_at to sales if missing
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='sales' AND column_name='synced_at';")
    if not cur.fetchone():
        print("Adding synced_at to sales table...")
        cur.execute("ALTER TABLE sales ADD COLUMN synced_at TIMESTAMP;")
    
    # Add synced_at to orders if missing
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='orders' AND column_name='synced_at';")
    if not cur.fetchone():
        print("Adding synced_at to orders table...")
        cur.execute("ALTER TABLE orders ADD COLUMN synced_at TIMESTAMP;")

    # Add sync_id to sales if missing
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='sales' AND column_name='sync_id';")
    if not cur.fetchone():
        print("Adding sync_id to sales table...")
        cur.execute("ALTER TABLE sales ADD COLUMN sync_id VARCHAR;")

    # Add plain_password to users if missing
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='plain_password';")
    if not cur.fetchone():
        print("Adding plain_password to users table...")
        cur.execute("ALTER TABLE users ADD COLUMN plain_password VARCHAR;")

    # Create companies table if missing
    print("Ensuring companies table exists...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS companies (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL
        );
    """)

    # Add company_id to items table if missing
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='items' AND column_name='company_id';")
    if not cur.fetchone():
        print("Adding company_id to items table...")
        cur.execute("ALTER TABLE items ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;")

    # Add image_url to items table if missing
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='items' AND column_name='image_url';")
    if not cur.fetchone():
        print("Adding image_url to items table...")
        cur.execute("ALTER TABLE items ADD COLUMN image_url VARCHAR(255);")

    # Add pieces_per_carton to items table if missing
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='items' AND column_name='pieces_per_carton';")
    if not cur.fetchone():
        print("Adding pieces_per_carton to items table...")
        cur.execute("ALTER TABLE items ADD COLUMN pieces_per_carton INTEGER DEFAULT 12 NOT NULL;")

    # Add unit_type to orders table if missing
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='orders' AND column_name='unit_type';")
    if not cur.fetchone():
        print("Adding unit_type to orders table...")
        cur.execute("ALTER TABLE orders ADD COLUMN unit_type VARCHAR(50) DEFAULT 'piece' NOT NULL;")

    # Add unit_type to sales table if missing
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='sales' AND column_name='unit_type';")
    if not cur.fetchone():
        print("Adding unit_type to sales table...")
        cur.execute("ALTER TABLE sales ADD COLUMN unit_type VARCHAR(50) DEFAULT 'piece' NOT NULL;")

    # Create price_types table if missing
    print("Ensuring price_types table exists...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS price_types (
            id SERIAL PRIMARY KEY,
            code VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL
        );
    """)

    # Populate default price types
    print("Populating default price types...")
    cur.execute("""
        INSERT INTO price_types (code, name) VALUES
        ('retail', 'Retail Price'),
        ('wholesale', 'Wholesale Price'),
        ('retail_carton', 'Retail Price (Carton)'),
        ('wholesale_carton', 'Wholesale Price (Carton)')
        ON CONFLICT (code) DO NOTHING;
    """)

    # Create item_prices table if missing
    print("Ensuring item_prices table exists...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS item_prices (
            id SERIAL PRIMARY KEY,
            item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
            price_type_id INTEGER NOT NULL REFERENCES price_types(id) ON DELETE CASCADE,
            price DOUBLE PRECISION NOT NULL,
            CONSTRAINT uq_item_price_type UNIQUE (item_id, price_type_id)
        );
    """)

    # Migrate existing items prices to retail price type
    print("Migrating existing item prices...")
    cur.execute("""
        INSERT INTO item_prices (item_id, price_type_id, price)
        SELECT i.id, p.id, i.price
        FROM items i
        CROSS JOIN price_types p
        WHERE p.code = 'retail'
        AND NOT EXISTS (
            SELECT 1 FROM item_prices ip 
            WHERE ip.item_id = i.id AND ip.price_type_id = p.id
        );
    """)

    print("Database fix completed.")
    cur.close()
    conn.close()

if __name__ == "__main__":
    fix_db()
