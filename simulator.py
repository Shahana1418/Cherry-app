#!/usr/bin/env python3
"""
Cherry Precision — Air Gauge Simulator
Sends fake *..# packets over a virtual serial port for testing.

Usage:
  Step 1: Create virtual COM pair (keep running in a separate terminal):
    socat -d -d pty,raw,echo=0,link=/tmp/vcom0 pty,raw,echo=0,link=/tmp/vcom1

  Step 2: Run this simulator:
    python3 simulator.py

  Step 3: In the Cherry Precision app:
    - Go to Live Data page
    - Select /tmp/vcom0
    - Click Connect
    - Watch data appear!
"""

import serial
import time
import random
import sys
from datetime import datetime

# Configuration
PORT = '/tmp/vcom1'  # Simulator writes to this end
BAUD_RATE = 115200
SEND_INTERVAL = 0.3  # seconds between packets

# Sample nominal values (in raw format matching your data)
NOMINAL = "0001997900"
UPPER_TOL = "199900"

def build_packet():
    """Build a single *..# packet matching the air gauge data format.
    
    Field layout (1-indexed positions inside *..#):
      Hours=1,2  Minutes=3,4  Seconds=5,6  (pos 7 = spacer)
      Date=8,9   Month=10,11  Year=12,13
      AirGauge ID=14,15,16   Channel=17,18   Offset=19,20  (pos 21 = spacer)
      Drawing Value=22-28 (7 chars)   (pos 29,30 = spacer)
      Reading=31-37 (7 chars)
      Status=38 (A/B/C)
      Comp ID=39-48 (10 chars)   Employee ID=49-51   Machine ID=52,53
    """
    now = datetime.now()
    time_str = now.strftime("%H%M%S")  # positions 1-6

    # Spacer at position 7
    spacer1 = "0"

    # Date: positions 8-13
    date_str = now.strftime("%d%m%y")  # DDMMYY

    # AirGauge ID: positions 14-16 (3 digits)
    airgauge_id = f"{random.choice([1, 2, 3]):03d}"

    # Channel: positions 17-18 (2 digits)
    # We will strictly map AG1->CH1, AG2->CH2, AG3->CH3 so it's beautifully organized
    if airgauge_id == "001":
        channel = "01"
    elif airgauge_id == "002":
        channel = "02"
    else:
        channel = "03"

    # Offset: positions 19-20 (2 digits)
    offset = f"{random.randint(0, 20):02d}"

    # Spacer at position 21
    spacer2 = "0"

    # Drawing value: positions 22-28 (7 chars, decimal after 3rd digit interpreted)
    if airgauge_id == "001":
        drawing = "3500000"  # represents 350.0000
        base = 3500000
        reading_offset = random.randint(-40000, 40000)
    elif airgauge_id == "002":
        drawing = "3500000"  # represents 350.0000
        base = 3500000
        reading_offset = random.randint(-40000, 40000)
    else:
        drawing = "3500000"  # represents 350.0000
        base = 3500000
        reading_offset = random.randint(-40000, 40000)

    # Spacer at positions 29-30
    spacer3 = "00"

    # Reading: positions 31-37 (7 chars, decimal after 3rd digit interpreted)
    reading_val = base + reading_offset
    reading_str = f"{reading_val:07d}"

    # Status: position 38
    status = random.choice(["A", "A", "A", "A", "B", "C"])

    # Component ID: positions 39-48 (10 chars, padded)
    comp_ids = ["sridharrao", "shaft00123", "ring000456", "gear007890"]
    comp_id = random.choice(comp_ids)[:10].ljust(10)

    # Employee ID: positions 49-51 (3 chars)
    # Use known IDs from Employee Master so User ID column shows "code - name"
    emp_id = random.choice(["567", "123", "034", "012"])

    # Machine ID: positions 52-53 (2 chars)
    # Use known codes from Machine Master so Machine ID column shows "code - name"
    machine_id = random.choice(["12", "15", "20", "25"])

    # Build: *{time}{spacer1}{date}{airgaugeId}{channel}{offset}{spacer2}{drawing}{spacer3}{reading}{status}{compId}{empId}{machineId}#
    inner = f"{time_str}{spacer1}{date_str}{airgauge_id}{channel}{offset}{spacer2}{drawing}{spacer3}{reading_str}{status}{comp_id}{emp_id}{machine_id}"
    packet = f"*{inner}#"
    return packet


def main():
    print(f"🔌 Cherry Precision Simulator — Air Gauge Data")
    print(f"   Port: {PORT}")
    print(f"   Baud: {BAUD_RATE}")
    print(f"   Interval: {SEND_INTERVAL}s")
    print(f"")
    print(f"⏳ Make sure socat is running first:")
    print(f"   socat -d -d pty,raw,echo=0,link=/tmp/vcom0 pty,raw,echo=0,link=/tmp/vcom1")
    print(f"")

    try:
        ser = serial.Serial(PORT, BAUD_RATE, timeout=1)
        print(f"✅ Connected to {PORT}")
        print(f"📡 Sending packets... (Ctrl+C to stop)")
        print(f"")
    except Exception as e:
        print(f"❌ Failed to open {PORT}: {e}")
        print(f"   Make sure socat is running first!")
        sys.exit(1)

    count = 0
    try:
        while True:
            packet = build_packet()
            ser.write(packet.encode('utf-8'))
            count += 1

            # Parse for display
            inner = packet[1:-1]
            time_disp = f"{inner[0:2]}:{inner[2:4]}:{inner[4:6]}"
            date_disp = f"{inner[7:9]}/{inner[9:11]}/{inner[11:13]}"
            ag_id = inner[13:16].lstrip('0') or '0'
            reading = f"{inner[30:33]}.{inner[33:37]}"
            status = inner[37]

            status_icon = "✅" if status == "A" else ("❌" if status == "B" else "🔄")
            print(f"  [{count:4d}] {status_icon} Date={date_disp}  Time={time_disp}  AG={ag_id}  Reading={reading}  Status={status}")

            time.sleep(SEND_INTERVAL)

    except KeyboardInterrupt:
        print(f"\n🛑 Stopped. Sent {count} packets.")
        ser.close()


if __name__ == "__main__":
    main()
