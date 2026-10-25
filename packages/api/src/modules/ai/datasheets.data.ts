export interface EquipmentDatasheet {
  model: string;
  name: string;
  manufacturer: string;
  category: string;
  datasheetUrl: string;
  manualUrl?: string;
  specs: {
    bandwidth?: string;
    channels?: string;
    sampleRate?: string;
    memoryDepth?: string;
    maxVoltage?: string;
    maxCurrent?: string;
    resolution?: string;
    accuracy?: string;
    frequencyRange?: string;
    interfaces?: string;
    powerRating?: string;
    temperatureRange?: string;
    features?: string;
    core?: string;
    memory?: string;
    [key: string]: string | undefined;
  };
  pinoutOrPorts?: string[];
  safetyGuidelines: string[];
  labApplications: string[];
}

export const EQUIPMENT_DATASHEETS: Record<string, EquipmentDatasheet> = {
  "DS1054Z": {
    model: "Rigol DS1054Z",
    name: "Digital Storage Oscilloscope",
    manufacturer: "Rigol Technologies",
    category: "Measurement",
    datasheetUrl: "https://www.rigolna.com/products/digital-oscilloscopes/1000z/",
    manualUrl: "https://beyondmeasure.rigoltech.com/acton/attachment/1579/u-0599/0/-/-/-/-/DS1000Z_UserGuide_EN.pdf",
    specs: {
      bandwidth: "50 MHz (Expandable to 100 MHz)",
      channels: "4 Analog Channels",
      sampleRate: "1 GSa/s (Single Channel), 500 MSa/s (Dual Channel), 250 MSa/s (All 4)",
      memoryDepth: "12 Mpts standard (24 Mpts optional)",
      maxVoltage: "300 Vrms CAT I with standard 10X probe",
      resolution: "8-bit vertical",
      interfaces: "USB Host & Device, LAN (LXI), Optional GPIB",
    },
    pinoutOrPorts: [
      "CH1 - CH4 BNC Analog Input Jacks (1 MΩ // 15 pF)",
      "EXT TRIG BNC Trigger Input",
      "Probe Compensation Terminal (3 V, 1 kHz square wave)",
      "Rear USB Type B Device port (USBTMC / SCPI compliant)",
      "Rear RJ45 Ethernet LAN port (Web control & LXI)",
      "Rear USB Type A Port for flash drive export",
    ],
    safetyGuidelines: [
      "Never connect oscilloscope probe ground lead to non-isolated live mains.",
      "Use 10X probe attenuation setting for signals above 5V to protect the input FETs.",
      "Maximum input voltage at BNC is 300 Vrms CAT I, 400 Vpk.",
      "Ensure chassis ground is securely connected through the 3-prong mains plug.",
    ],
    labApplications: [
      "Electronics & Measurement Lab: Circuit debugging, ripple measurement, transient analysis.",
      "Signal decoding: SPI, I2C, and UART bus packet analysis.",
    ],
  },
  "Rigol DS1054Z": {
    model: "Rigol DS1054Z",
    name: "Digital Storage Oscilloscope",
    manufacturer: "Rigol Technologies",
    category: "Measurement",
    datasheetUrl: "https://www.rigolna.com/products/digital-oscilloscopes/1000z/",
    manualUrl: "https://beyondmeasure.rigoltech.com/acton/attachment/1579/u-0599/0/-/-/-/-/DS1000Z_UserGuide_EN.pdf",
    specs: {
      bandwidth: "50 MHz",
      channels: "4 Channels",
      sampleRate: "1 GSa/s",
      memoryDepth: "24 Mpts",
      maxVoltage: "300 Vrms CAT I",
      resolution: "8-bit",
      interfaces: "USB, LAN (LXI)",
    },
    safetyGuidelines: [
      "Verify probe attenuation switch (1X vs 10X) before applying signals.",
      "Do not apply direct mains AC voltage without a high-voltage differential probe.",
    ],
    labApplications: ["Analog circuit characterization", "Filter frequency response verification"],
  },
  "TDS2024C": {
    model: "Tektronix TDS2024C",
    name: "Digital Storage Oscilloscope",
    manufacturer: "Tektronix",
    category: "Measurement",
    datasheetUrl: "https://www.tek.com/en/datasheet/digital-storage-oscilloscopes-tds2000c-series",
    manualUrl: "https://download.tek.com/manual/071272200.pdf",
    specs: {
      bandwidth: "200 MHz",
      channels: "4 Analog Channels",
      sampleRate: "2.0 GSa/s on all channels simultaneously",
      memoryDepth: "2.5 k points per channel",
      maxVoltage: "300 Vrms CAT II at BNC input",
      resolution: "8-bit",
      interfaces: "USB 2.0 Host (front panel), USB 2.0 Device (rear panel)",
    },
    pinoutOrPorts: [
      "CH1, CH2, CH3, CH4 BNC 1 MΩ inputs",
      "Probe Comp: 5.0 V, 1 kHz reference",
      "USB Flash drive front connector",
      "Rear OpenChoice PC communication port",
    ],
    safetyGuidelines: [
      "Observe all terminal ratings marked on front panel (CAT II 300V).",
      "Always connect ground clip of probe to earth potential only.",
    ],
    labApplications: [
      "High-speed digital pulse measurement in Electronics and Project Labs.",
      "Motor drive PWM timing verification in Electric Machines Lab.",
    ],
  },
  "Tektronix TDS2024C": {
    model: "Tektronix TDS2024C",
    name: "Digital Storage Oscilloscope (200MHz)",
    manufacturer: "Tektronix",
    category: "Measurement",
    datasheetUrl: "https://www.tek.com/en/datasheet/digital-storage-oscilloscopes-tds2000c-series",
    manualUrl: "https://download.tek.com/manual/071272200.pdf",
    specs: {
      bandwidth: "200 MHz",
      channels: "4 Channels",
      sampleRate: "2 GSa/s",
      maxVoltage: "300 Vrms CAT II",
      resolution: "8-bit",
    },
    safetyGuidelines: ["Use CAT II rated probes.", "Do not float ground clips."],
    labApplications: ["Electronics and Measurement Lab signal timing"],
  },
  "MDO3104": {
    model: "Tektronix MDO3104",
    name: "Mixed Domain Oscilloscope",
    manufacturer: "Tektronix",
    category: "Measurement",
    datasheetUrl: "https://www.tek.com/en/datasheet/mixed-domain-oscilloscopes-mdo3000-series",
    manualUrl: "https://download.tek.com/manual/077098402.pdf",
    specs: {
      bandwidth: "1 GHz Oscilloscope + 3 GHz Integrated Spectrum Analyser",
      channels: "4 Analog Channels + 16 Digital Channels + 1 RF Channel",
      sampleRate: "5 GSa/s analog",
      memoryDepth: "10 Mpts per channel",
      interfaces: "USB, LAN, HDMI Video Out",
    },
    safetyGuidelines: [
      "RF input maximum continuous power: +20 dBm (0.1 W). Never apply DC to RF port.",
      "Use ESD wrist strap when handling digital logic probe clips.",
    ],
    labApplications: ["RF communication modulation analysis", "Mixed-signal embedded system debugging"],
  },
  "UT61E": {
    model: "UNI-T UT61E",
    name: "Modern Digital Multimeter",
    manufacturer: "Uni-Trend Technology",
    category: "Measurement",
    datasheetUrl: "https://meters.uni-trend.com/product/ut61-series/",
    manualUrl: "https://www.uni-trend.com/uploadfile/2019/0416/20190416041639912.pdf",
    specs: {
      maxVoltage: "1000 V DC / 750 V AC (CAT III 1000V, CAT IV 600V)",
      maxCurrent: "10 A AC/DC (Fused)",
      resolution: "22,000 Counts (4 1/2 digits)",
      accuracy: "DC Voltage: ±(0.1% + 2 digits)",
      frequencyRange: "10 Hz to 220 MHz",
      interfaces: "Optically isolated RS-232 / USB PC connection cable",
    },
    pinoutOrPorts: [
      "10A Terminal: 10 A max continuous, fused with ceramic fuse",
      "mA/µA Terminal: 220 mA max, fast-acting ceramic fuse",
      "COM Terminal: Common ground reference",
      "V/Ω/Hz/Cap Terminal: High side measurement input",
    ],
    safetyGuidelines: [
      "Never measure voltage with test leads plugged into current (A/mA) jacks.",
      "Inspect probe insulation for cuts or exposed metal before high-voltage measurements.",
      "Do not exceed 1000V DC or 750V AC RMS limits.",
    ],
    labApplications: [
      "General laboratory measurements in Electronics, Power Systems, and Project labs.",
      "High-precision DC bias measurement and True RMS AC signal monitoring.",
    ],
  },
  "UNI-T UT61E": {
    model: "UNI-T UT61E",
    name: "Modern Digital Multimeter",
    manufacturer: "Uni-Trend Technology",
    category: "Measurement",
    datasheetUrl: "https://meters.uni-trend.com/product/ut61-series/",
    manualUrl: "https://www.uni-trend.com/uploadfile/2019/0416/20190416041639912.pdf",
    specs: {
      maxVoltage: "1000 V DC / 750 V AC",
      maxCurrent: "10 A",
      resolution: "22,000 Counts True RMS",
    },
    safetyGuidelines: ["Never switch ranges while probes are energized."],
    labApplications: ["Benchtop precision testing"],
  },
  "Fluke 87V": {
    model: "Fluke 87V",
    name: "Industrial True-RMS Multimeter",
    manufacturer: "Fluke Corporation",
    category: "Measurement",
    datasheetUrl: "https://www.fluke.com/en-us/product/electrical-testing/digital-multimeters/fluke-87v",
    manualUrl: "https://dam-assets.fluke.com/s3fs-public/87v_____umeng0000.pdf",
    specs: {
      maxVoltage: "1000 V AC/DC (CAT III 1000V, CAT IV 600V)",
      maxCurrent: "10 A continuous (20 A for up to 30 seconds)",
      accuracy: "0.05% DC accuracy",
      bandwidth: "20 kHz AC Bandwidth with selectable Low Pass Filter",
      resolution: "4 1/2 digit mode (20,000 counts) / standard 6,000 counts",
    },
    pinoutOrPorts: [
      "10A Jack: Fused 11A 1000V FAST fuse",
      "400mA Jack: Fused 440mA 1000V FAST fuse",
      "COM: Common return",
      "V/Ω/Diode: Positive voltage and resistance input",
    ],
    safetyGuidelines: [
      "Input alert beeper warns if test lead is inserted into current jack while voltage is selected.",
      "Rated for industrial environments and high-energy transients (CAT IV 600V).",
    ],
    labApplications: [
      "Power Systems and High Voltage Lab: Precision motor drive and high voltage bench work.",
      "VFD output voltage measurements using the built-in low-pass filter.",
    ],
  },
  "DG1022Z": {
    model: "Rigol DG1022Z",
    name: "Function / Arbitrary Waveform Generator",
    manufacturer: "Rigol Technologies",
    category: "Signal Source",
    datasheetUrl: "https://www.rigolna.com/products/waveform-generators/dg1000z/",
    manualUrl: "https://beyondmeasure.rigoltech.com/acton/attachment/1579/u-0598/0/-/-/-/-/DG1000Z_UserGuide.pdf",
    specs: {
      frequencyRange: "Sine: 1 µHz to 25 MHz, Square: 1 µHz to 25 MHz",
      channels: "2 Independent Output Channels with phase synchronization",
      sampleRate: "200 MSa/s SiFi (Signal Fidelity) technology",
      resolution: "14-bit vertical resolution",
      interfaces: "USB Host, USB Device, LAN (LXI)",
    },
    pinoutOrPorts: [
      "CH1 BNC Output: 50 Ω output impedance, 10 Vpp into 50 Ω",
      "CH2 BNC Output: 50 Ω output impedance",
      "Counter / Trigger In / Out BNC (Rear)",
      "Sync TTL Output BNC",
    ],
    safetyGuidelines: [
      "Do not apply external voltages to the CH1/CH2 output BNC terminals.",
      "Check 50 Ω vs High-Z termination setting to prevent 2X amplitude mismatch.",
    ],
    labApplications: [
      "Filter test signals, operational amplifier frequency sweeps, transducer simulation.",
    ],
  },
  "Rigol DG1022Z": {
    model: "Rigol DG1022Z",
    name: "Function / Arbitrary Waveform Generator",
    manufacturer: "Rigol Technologies",
    category: "Signal Source",
    datasheetUrl: "https://www.rigolna.com/products/waveform-generators/dg1000z/",
    manualUrl: "https://beyondmeasure.rigoltech.com/acton/attachment/1579/u-0598/0/-/-/-/-/DG1000Z_UserGuide.pdf",
    specs: {
      frequencyRange: "1 µHz to 25 MHz",
      channels: "2 Channels",
      sampleRate: "200 MSa/s",
      resolution: "14-bit",
    },
    safetyGuidelines: ["Ensure output is disabled (OFF) before wiring to sensitive circuits."],
    labApplications: ["Signal synthesis in Electronics and Measurement Lab."],
  },
  "DP832": {
    model: "Rigol DP832",
    name: "Programmable Triple Output DC Power Supply",
    manufacturer: "Rigol Technologies",
    category: "Power Supply",
    datasheetUrl: "https://www.rigolna.com/products/dc-power-supplies/dp800/",
    manualUrl: "https://beyondmeasure.rigoltech.com/acton/attachment/1579/u-0610/0/-/-/-/-/DP800_UserGuide_EN.pdf",
    specs: {
      channels: "3 Isolated Channels: CH1 (30V/3A), CH2 (30V/3A), CH3 (5V/3A)",
      powerRating: "Total Output Power: 195 Watts",
      accuracy: "Programming accuracy: <0.05% + 10 mV",
      resolution: "1 mV / 1 mA readback",
      interfaces: "USB Host, USB Device, LAN (LXI), Digital I/O",
    },
    pinoutOrPorts: [
      "CH1 (+, -, GND terminals with sense pins)",
      "CH2 (+, -, GND terminals)",
      "CH3 (+, -, GND terminals for 5V digital logic)",
      "Chassis Earth Ground Terminal (Green)",
    ],
    safetyGuidelines: [
      "Set Over-Voltage Protection (OVP) and Over-Current Protection (OCP) before energizing load.",
      "Do not short circuit outputs at maximum current setting without proper heat dissipation.",
    ],
    labApplications: [
      "Powering analog circuits, microcontroller prototypes, and power electronic driver circuits.",
    ],
  },
  "Rigol DP832": {
    model: "Rigol DP832",
    name: "Triple-Output Linear DC Power Supply",
    manufacturer: "Rigol Technologies",
    category: "Power Supply",
    datasheetUrl: "https://www.rigolna.com/products/dc-power-supplies/dp800/",
    manualUrl: "https://beyondmeasure.rigoltech.com/acton/attachment/1579/u-0610/0/-/-/-/-/DP800_UserGuide_EN.pdf",
    specs: {
      channels: "3 Outputs (30V/3A, 30V/3A, 5V/3A)",
      powerRating: "195 W",
    },
    safetyGuidelines: ["Confirm voltage settings with a multimeter before connecting to active loads."],
    labApplications: ["Laboratory breadboard power"],
  },
  "IM3523": {
    model: "Hioki IM3523",
    name: "Precision LCR Meter",
    manufacturer: "Hioki E.E. Corporation",
    category: "Measurement",
    datasheetUrl: "https://www.hioki.com/us-en/products/lcr-meters/lcr/id_5893",
    manualUrl: "https://www.hioki.com/download/pdf/manual/im3523_manual.pdf",
    specs: {
      frequencyRange: "40 Hz to 200 kHz (1 Hz resolution)",
      accuracy: "Basic accuracy: ±0.05% rdg.",
      maxVoltage: "Test signal level: 5 mV to 5 Vrms / 10 µA to 100 mA",
      interfaces: "LAN, USB, RS-232C, GP-IB",
    },
    safetyGuidelines: [
      "Discharge all capacitors completely before connecting to Kelvin test fixtures.",
      "Residual charge above 5V will permanently damage the input measurement bridge.",
    ],
    labApplications: [
      "Capacitor ESR, inductor Q factor, and transformer winding inductance measurements.",
    ],
  },
  "Hakko FX-951": {
    model: "Hakko FX-951",
    name: "Soldering Station (Lead-Free)",
    manufacturer: "Hakko Corporation",
    category: "Assembly",
    datasheetUrl: "https://www.hakko.com/english/products/hakko_fx951.html",
    manualUrl: "https://www.hakko.com/english/products/hakko_fx951_instruction.html",
    specs: {
      powerRating: "75 W (Iron: 24V AC)",
      temperatureRange: "200°C to 450°C (Controlled via internal micro-sensor in composite tip)",
      interfaces: "Process control card lock key, Sleep mode interlock",
    },
    safetyGuidelines: [
      "Soldering iron tip reaches 400°C+. Never touch tip with bare skin.",
      "Work in well-ventilated areas with solder fume extraction turned ON.",
      "Always return iron to the stand when not actively making a joint.",
    ],
    labApplications: ["PCB assembly and prototyping in 24x7 Project Lab."],
  },
  "Cisco WS-C2960-24TT": {
    model: "Cisco Catalyst 2960-24TT-L",
    name: "Enterprise Ethernet Switch",
    manufacturer: "Cisco Systems",
    category: "Networking",
    datasheetUrl: "https://www.cisco.com/c/en/us/products/collateral/switches/catalyst-2960-series-switches/product_data_sheet0900aecd80322c0c.html",
    manualUrl: "https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst2960/hardware/installation/guide/2960_hig.html",
    specs: {
      interfaces: "24x 10/100BASE-TX Fast Ethernet Ports + 2x 10/100/1000BASE-T Uplink Ports",
      bandwidth: "16 Gbps Forwarding Bandwidth",
      features: "IEEE 802.1Q VLAN trunking, Spanning Tree (STP), Port Security, QoS, SSHv2",
    },
    pinoutOrPorts: [
      "RJ45 Console Port (9600-8-N-1 roll-over cable)",
      "FastEthernet 0/1 - 0/24 (RJ45 auto-MDIX)",
      "GigabitEthernet 0/1 - 0/2 Uplinks",
    ],
    safetyGuidelines: [
      "Ensure rack mount screws are tight and earth grounding stud is grounded.",
      "Do not connect power cables until rack chassis is secured.",
    ],
    labApplications: [
      "Information Engineering Laboratory: Cisco CCNA practicals, VLAN segmentations, trunking.",
    ],
  },
  "Cisco CISCO1941/K9": {
    model: "Cisco 1941 Integrated Services Router",
    name: "Integrated Services Router (ISR)",
    manufacturer: "Cisco Systems",
    category: "Networking",
    datasheetUrl: "https://www.cisco.com/c/en/us/products/collateral/routers/1900-series-integrated-services-routers-isr/data_sheet_c78_556319.html",
    manualUrl: "https://www.cisco.com/c/en/us/td/docs/routers/access/1900/hardware/installation/guide/1900_hig.html",
    specs: {
      interfaces: "2x Integrated 10/100/1000 Ethernet Ports, 2x Enhanced High-Speed WAN Interface Card (EHWIC) slots",
      features: "Hardware-accelerated IPsec VPN, IPv6 routing, OSPF, EIGRP, BGP, Access Control Lists (ACLs)",
    },
    safetyGuidelines: [
      "Power down before inserting or removing EHWIC serial modules.",
      "Ensure proper ventilation around fans.",
    ],
    labApplications: [
      "Information Engineering Lab: WAN routing, inter-VLAN routing (Router-on-a-stick), NAT.",
    ],
  },
  "Xilinx Basys 3": {
    model: "Digilent / Xilinx Basys 3",
    name: "Artix-7 FPGA Trainer Board",
    manufacturer: "Digilent / Xilinx",
    category: "Computing",
    datasheetUrl: "https://digilent.com/reference/programmable-logic/basys-3/reference-manual",
    manualUrl: "https://digilent.com/reference/programmable-logic/basys-3/start",
    specs: {
      model: "Xilinx Artix-7 FPGA (XC7A35T-1CPG236C)",
      features: "33,280 logic cells in 5,200 slices, 1,800 Kbits fast block RAM, 90 DSP slices, internal clock speeds >450 MHz",
      interfaces: "16 User Switches, 16 User LEDs, 5 User Pushbuttons, 4-Digit 7-Segment Display, 12-bit VGA output, USB-UART bridge, 4x Pmod expansion headers",
    },
    safetyGuidelines: [
      "ESD sensitive board: wear ESD wrist strap or touch grounded metal chassis before handling.",
      "Supply only 5V DC via micro-USB or external jack. Never apply >5.5V.",
    ],
    labApplications: [
      "Electronics and Measurement Lab: VHDL/Verilog digital circuit design, ALU synthesis, FSMs.",
    ],
  },
  "STM32F4 Discovery": {
    model: "STM32F407G-DISC1",
    name: "ARM Cortex-M4 Development Board",
    manufacturer: "STMicroelectronics",
    category: "Microcontroller",
    datasheetUrl: "https://www.st.com/en/evaluation-tools/stm32f4discovery.html",
    manualUrl: "https://www.st.com/resource/en/user_manual/um1472-discovery-kit-with-stm32f407vg-mcu-stmicroelectronics.pdf",
    specs: {
      core: "ARM 32-bit Cortex-M4 with FPU @ 168 MHz",
      memory: "1 MB Flash, 192 KB RAM",
      peripherals: "ST-LINK/V2-A debugger on-board, LIS3DSH accelerometer, MP45DT02 MEMS microphone, CS43L22 audio DAC, USB OTG FS",
    },
    safetyGuidelines: ["Operating voltage is 3.3V logic. 5V on non-tolerant pins will destroy the MCU."],
    labApplications: ["Embedded systems design, digital filtering, real-time control algorithms."],
  },
  "Siemens Sinamics G120": {
    model: "Siemens Sinamics G120",
    name: "Variable Frequency Inverter Drive (VFD)",
    manufacturer: "Siemens",
    category: "Power Electronics",
    datasheetUrl: "https://www.siemens.com/global/en/products/automation/drives/sinamics/low-voltage-converters/sinamics-g120.html",
    manualUrl: "https://support.industry.siemens.com/cs/document/109781807/sinamics-g120-converter-operating-instructions?dti=0&lc=en-US",
    specs: {
      powerRating: "0.55 kW to 250 kW range (Lab unit: 1.5 kW 400V 3-Phase)",
      features: "Vector control, V/f control, regenerative feedback, PROFINET / PROFIBUS communication",
    },
    safetyGuidelines: [
      "DANGER: DC-link capacitors hold fatal charge (>500V DC) for 5+ minutes after AC power disconnect.",
      "Always measure DC link voltage with Fluke multimeter before touching terminals.",
      "Ensure motor frame and inverter chassis are connected to protective earth (PE).",
    ],
    labApplications: [
      "Electric Machines and Power Electronics Lab: Induction motor variable speed control, regenerative braking experiments.",
    ],
  },
  "Leroy-Somer LS90": {
    model: "Leroy-Somer LS90",
    name: "3-Phase AC Induction Motor Test Set",
    manufacturer: "Nidec Leroy-Somer",
    category: "Electric Machine",
    datasheetUrl: "https://acim.nidec.com/motors/leroy-somer/products/ac-motors/cast-iron-three-phase-induction-motors",
    specs: {
      powerRating: "1.5 kW, 400 V / 230 V Delta/Star, 50 Hz, 1420 RPM, 4-Pole",
      features: "Coupled torque transducer and optical tachometer for torque-slip curves",
    },
    safetyGuidelines: [
      "Keep loose clothing, ties, and hair tied back from rotating shafts.",
      "Ensure protective coupling guard is bolted securely before starting motor.",
      "Emergency Stop (E-Stop) button must be within arm's reach.",
    ],
    labApplications: [
      "Electric Machines Lab: No-load test, blocked rotor test, torque-speed characteristics.",
    ],
  },
  "USRP B210": {
    model: "Ettus Research USRP B210",
    name: "Software Defined Radio (SDR)",
    manufacturer: "National Instruments / Ettus Research",
    category: "RF Instrument",
    datasheetUrl: "https://www.ettus.com/all-products/ub210-kit/",
    manualUrl: "https://files.ettus.com/manual/page_usrp_b200.html",
    specs: {
      frequencyRange: "70 MHz to 6 GHz continuous RF coverage",
      bandwidth: "Up to 56 MHz instantaneous bandwidth in 1x1 mode, 30.72 MHz in 2x2 MIMO",
      channels: "2 Transmit, 2 Receive (Full Duplex)",
      interfaces: "High-Speed USB 3.0",
    },
    safetyGuidelines: [
      "Never transmit without a matched 50 Ω antenna or RF terminator connected to TX/RX ports.",
      "Maximum input power at RX port is -15 dBm. Signals above +0 dBm will damage the LNA front-end.",
    ],
    labApplications: [
      "Communication and Systems Engineering Lab: GNU Radio, 4G/5G signal processing, SDR modulations.",
    ],
  },
};

export function findDatasheet(query: string): EquipmentDatasheet | null {
  const q = query.toLowerCase().trim();
  for (const [key, ds] of Object.entries(EQUIPMENT_DATASHEETS)) {
    if (
      key.toLowerCase().includes(q) ||
      ds.model.toLowerCase().includes(q) ||
      ds.name.toLowerCase().includes(q) ||
      q.includes(key.toLowerCase()) ||
      q.includes(ds.model.toLowerCase())
    ) {
      return ds;
    }
  }
  return null;
}
