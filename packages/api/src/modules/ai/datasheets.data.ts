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

// ============================================================
// DEPARTMENT OF ELECTRICAL & INFORMATION ENGINEERING LAB MANUALS
// ============================================================

export interface PracticalDetail {
  number: number;
  title: string;
  objective: string;
  componentsAndEquipment: string[];
  circuitSetup: string;
  procedure: string[];
  measurementGuide: string[];
  troubleshootingScenarios: string[];
  safetyRules: string[];
}

export interface DepartmentLabManual {
  id: string;
  courseCode: string;
  title: string;
  department: string;
  semester: string;
  labName: string;
  location: string;
  description: string;
  recommendedEquipment: string[];
  practicals: PracticalDetail[];
}

export const DEPARTMENT_LAB_MANUALS: Record<string, DepartmentLabManual> = {
  "EE3203-analog": {
    id: "EE3203-analog",
    courseCode: "EE3203",
    title: "Analog Electronics Laboratory Manual",
    department: "Department of Electrical & Information Engineering",
    semester: "Semester 5",
    labName: "Electronics and Measurement Laboratory",
    location: "Block A, 2nd Floor",
    description: "Covers discrete transistor amplifiers, operational amplifier topologies, active filters, and non-linear waveform generators.",
    recommendedEquipment: [
      "Rigol DS1054Z 50MHz Digital Oscilloscope",
      "Rigol DG1022Z Dual-Channel Arbitrary Function Generator",
      "Rigol DP832 Triple-Output Programmable DC Power Supply",
      "Fluke 87V True-RMS Digital Multimeter",
      "Solderless Breadboard, BNC-to-Alligator Cables, 10X Probes",
    ],
    practicals: [
      {
        number: 1,
        title: "BJT Common Emitter Amplifier Frequency Response & Gain Analysis",
        objective: "Biasing 2N3904/2N2222 transistor in active region, measuring midband AC voltage gain, lower cutoff (fL) and upper cutoff (fH) frequencies.",
        componentsAndEquipment: ["2N3904 NPN BJT", "Resistors (10k, 2.2k, 1k, 470Ω)", "Capacitors (10uF, 100uF, 100nF)", "Rigol DS1054Z", "Rigol DG1022Z", "Rigol DP832"],
        circuitSetup: "Configure voltage divider bias (R1=10kΩ, R2=2.2kΩ, RC=1kΩ, RE=470Ω). Connect Cin=10uF to base, Cout=10uF to collector, and bypass capacitor CE=100uF across RE. Supply +12V DC from Rigol DP832 CH1.",
        procedure: [
          "Verify DC quiescent point before applying AC signal: Measure VBE (~0.7V), VCE (~6V) using Fluke 87V.",
          "Set Function Generator CH1 to 1 kHz Sine wave, 20 mVpp (Low amplitude to avoid clipping non-linearity).",
          "Connect Oscilloscope CH1 to input AC coupling, and CH2 to amplifier output AC coupling.",
          "Vary frequency from 20 Hz to 2 MHz in decade intervals; record input and output peak-to-peak voltages.",
          "Plot Bode magnitude response: Gain (dB) = 20 * log10(Vout / Vin) and determine 3dB bandwidth.",
        ],
        measurementGuide: [
          "Use Oscilloscope Cursor menu (Time & Amplitude) for exact peak-to-peak and phase measurement.",
          "Confirm 180° phase inversion between input and output waveforms.",
          "If output waveform shows flat tops (saturation) or flat bottoms (cutoff), decrease input amplitude below 20 mVpp.",
        ],
        troubleshootingScenarios: [
          "Scenario A: Output signal is flat or 0V -> Check DC power supply rails and ensure ground clip of BNC probe is connected to breadboard 0V bus.",
          "Scenario B: 50 Hz hum on trace -> Ensure oscilloscope ground clip is firmly connected to circuit common GND, not left floating.",
          "Scenario C: Gain is 10x smaller than calculated -> Check if CE bypass capacitor is plugged in backwards (observe electrolytic polarity!) or disconnected.",
        ],
        safetyRules: [
          "Ensure DP832 DC current limit is set to 100 mA before powering the circuit.",
          "Never connect probe ground clips to supply rails (+12V); probe ground is connected directly to Earth Ground!",
        ],
      },
      {
        number: 2,
        title: "Operational Amplifier Active Low-Pass & Sallen-Key Filters",
        objective: "Design and verify first-order and second-order active low-pass filters using LM741 / TL082 op-amps.",
        componentsAndEquipment: ["TL082 / LM741 Op-Amp", "Resistors (10k, 1k)", "Capacitors (10nF, 100nF)", "Dual Power Supply (+/- 12V)", "Rigol DS1054Z"],
        circuitSetup: "Dual supply: Connect +12V to Pin 7 (or Pin 8 on TL082), -12V to Pin 4, and common ground to circuit 0V reference. Configure feedback resistors on inverting pin.",
        procedure: [
          "Measure op-amp output DC offset with inputs grounded; ensure offset is < 5 mV.",
          "Inject 100 Hz to 100 kHz sinusoidal sweep from Rigol DG1022Z.",
          "Record amplitude roll-off rate (-20 dB/decade for 1st order, -40 dB/decade for 2nd order Sallen-Key).",
          "Determine experimental cutoff frequency fc = 1 / (2 * pi * R * C) and compare with theoretical value.",
        ],
        measurementGuide: [
          "Enable Rigol DS1054Z Channel Math (FFT or Bode feature) to observe spectral roll-off.",
          "Ensure input voltage does not exceed op-amp common-mode input range.",
        ],
        troubleshootingScenarios: [
          "Scenario A: Op-amp output latches to +12V or -12V -> Check that negative supply pin is connected to -12V and NOT ground.",
          "Scenario B: High frequency oscillation -> Place 100nF ceramic decoupling capacitors directly across supply pins 7 & 4 to ground.",
        ],
        safetyRules: [
          "Always turn off DC supply before inserting or removing op-amp ICs from the breadboard.",
        ],
      },
    ],
  },
  "EE4302-machines": {
    id: "EE4302-machines",
    courseCode: "EE4302",
    title: "Electric Machines & Power Electronics Laboratory Manual",
    department: "Department of Electrical & Information Engineering",
    semester: "Semester 7",
    labName: "Electric Machines and Power Electronics Laboratory",
    location: "Block C, 1st Floor",
    description: "Focuses on three-phase induction machine dynamics, Siemens Sinamics VFD inverter motor control, and thyristor power converters.",
    recommendedEquipment: [
      "Leroy-Somer LS90 1.5kW 3-Phase Induction Motor & Dynamometer Test Set",
      "Siemens Sinamics G120 Variable Frequency Drive (VFD)",
      "Fluke 435-II 3-Phase Power Quality Analyzer",
      "Tektronix Isolated High-Voltage Differential Probes",
      "Digital Optical Tachometer & Torque Transducer Console",
    ],
    practicals: [
      {
        number: 1,
        title: "3-Phase Induction Motor No-Load and Blocked-Rotor Tests",
        objective: "Determine equivalent circuit parameters (R1, X1, R2', X2', Rc, Xm) and assess efficiency and torque-slip characteristics.",
        componentsAndEquipment: ["Leroy-Somer LS90 1.5kW Motor", "3-Phase Auto-transformer (Variac)", "Fluke 435-II Analyzer", "Mechanical Brake / Dynamometer"],
        circuitSetup: "Connect stator in Star (Y) configuration to 3-phase supply via 3-phase variac and Fluke 435-II current clamps and voltage leads.",
        procedure: [
          "No-Load Test: Run motor uncoupled at rated line voltage (400V, 50Hz); record V0, I0, and P0 (core loss + friction loss).",
          "Blocked-Rotor Test: Mechanically lock rotor shaft securely. Slowly increase variac from 0V until rated current (approx 3.2A) is reached.",
          "Record short-circuit voltage Vsc, current Isc, and active power Psc; immediately shut off power to avoid rotor overheating.",
          "Compute per-phase equivalent circuit resistance and reactance parameters.",
        ],
        measurementGuide: [
          "Use Fluke 435-II two-wattmeter method display for accurate total 3-phase active power measurement.",
          "Measure DC stator winding resistance with Fluke 87V DMM immediately after test and apply temperature correction.",
        ],
        troubleshootingScenarios: [
          "Scenario A: Motor hums loudly and will not rotate -> Check for blown phase fuse or open conductor in one phase (single phasing).",
          "Scenario B: Inverted active power reading on one phase -> Reverse current clamp direction (arrow must point towards motor load).",
        ],
        safetyRules: [
          "Always lock coupling guard cage before energizing motor.",
          "Blocked-rotor test must NOT exceed 15 seconds to prevent thermal breakdown of rotor windings.",
          "Keep Emergency Stop button within hand reach at all times.",
        ],
      },
      {
        number: 2,
        title: "Siemens Sinamics G120 VFD Variable Speed & V/f Control",
        objective: "Parameterize Siemens Sinamics G120 inverter drive, implement scalar V/f constant flux speed regulation, and observe inverter PWM harmonics.",
        componentsAndEquipment: ["Siemens Sinamics G120 Inverter", "3-Phase Induction Motor", "Torque Dynamometer", "Differential Probes", "Rigol DS1054Z"],
        circuitSetup: "Wire 400V 3-phase mains to L1, L2, L3 of G120 drive. Connect motor terminals U, V, W to drive output. Connect operator panel (BOP-2) or PC via USB.",
        procedure: [
          "Perform motor identification and quick commissioning: Enter motor nameplate kW, rpm, rated current, and voltage.",
          "Set control mode to linear V/f (p1300 = 0). Set minimum frequency to 5 Hz and maximum frequency to 60 Hz.",
          "Run motor at 25 Hz, 50 Hz, and 60 Hz under varying mechanical dynamometer loads.",
          "Measure stator terminal voltage and fundamental frequency; plot V vs f curve to verify constant flux region.",
          "Observe inverter output PWM switching waveform using Tektronix differential voltage probe on oscilloscope.",
        ],
        measurementGuide: [
          "NEVER connect standard single-ended oscilloscope probe ground clip to VFD motor outputs! Use high-voltage differential probes only.",
          "Observe DC link bus voltage (~560V DC) via drive parameter r0026.",
        ],
        troubleshootingScenarios: [
          "Scenario A: Drive trips on Fault F07801 (Motor overcurrent) -> Increase acceleration ramp time (p1120) from 2.0s to 6.0s.",
          "Scenario B: Drive trips on Fault F07900 (Motor blocked / stall) -> Check mechanical brake load; reduce dynamometer torque.",
        ],
        safetyRules: [
          "Wait at least 5 minutes after disconnecting AC supply before touching VFD terminals to allow DC link capacitors to discharge below 50V.",
          "Ensure protective earth (PE) cable is bolted tightly to the drive chassis.",
        ],
      },
    ],
  },
  "EE3402-hv": {
    id: "EE3402-hv",
    courseCode: "EE3402",
    title: "Power Systems and High Voltage Engineering Laboratory Manual",
    department: "Department of Electrical & Information Engineering",
    semester: "Semester 6",
    labName: "Power Systems and High Voltage Laboratory",
    location: "Block C, Ground Floor",
    description: "High-voltage breakdown studies, sphere-gap calibration, lightning impulse flashover testing, and dielectric insulation diagnostics.",
    recommendedEquipment: [
      "Haefely Hipotronics 100kV AC High-Voltage Test Transformer Set",
      "Multi-Stage Marx Lightning Impulse Voltage Generator (1.2/50 μs)",
      "Standard 100mm and 250mm Sphere-Sphere Gap Assembly",
      "Capacitive & Resistive High-Voltage Voltage Divider",
      "High-Voltage Earthing Discharge Rod & Safety Interlock Cage",
    ],
    practicals: [
      {
        number: 1,
        title: "High-Voltage AC Breakdown of Sphere-Sphere and Needle-Plane Gaps",
        objective: "Investigate electric field uniformity effect on air dielectric breakdown, verify Peek's formula, and establish sparkover voltage vs gap distance curves.",
        componentsAndEquipment: ["100kV AC Test Set", "100mm Sphere Gap", "Needle-Plane Electrode Set", "Barometer & Thermometer", "Grounding Stick"],
        circuitSetup: "Mount electrode assembly inside the grounded high-voltage Faraday cage. Connect high-voltage bushing to upper electrode via water damping resistor (100kΩ). Connect lower electrode to system solid ground.",
        procedure: [
          "Record ambient temperature (°C) and atmospheric pressure (mmHg) to calculate air density correction factor (kd).",
          "Set sphere gap distance to 10 mm, 20 mm, 30 mm, 40 mm, and 50 mm.",
          "Close safety interlock gate. Turn on high-voltage control console key switch.",
          "Gradually raise primary variac voltage at a steady rate of ~1 kV/s until sparkover occurs.",
          "Record primary voltage, calculate secondary high-voltage breakdown value, repeat 5 times per distance, and compute average.",
          "Repeat the experiment using needle-plane electrodes to observe non-uniform field corona discharge and lower breakdown threshold.",
        ],
        measurementGuide: [
          "Calibrate secondary voltage measurement using the capacitive voltage divider readout.",
          "Correct all breakdown voltages to standard atmospheric conditions (20°C, 760 mmHg).",
        ],
        troubleshootingScenarios: [
          "Scenario A: Sparkover occurs at erratic low voltages -> Clean sphere surfaces with ethanol; inspect for dust, pit marks, or moisture.",
          "Scenario B: High-voltage will not energize -> Check safety cage gate limit switch interlock; ensure grounding rod is removed from HT busbar and hung in its cradle switch.",
        ],
        safetyRules: [
          "STRICT 2-PERSON OPERATING RULE: One person operates the console while the safety observer monitors the cage.",
          "NEVER enter the high-voltage cage without first touching the high-voltage bushing with the grounded discharge rod.",
          "Maintain minimum 2.5 meters clearance from any energized high-voltage conductor.",
        ],
      },
    ],
  },
  "EE2201-circuits": {
    id: "EE2201-circuits",
    courseCode: "EE2201",
    title: "Electric Circuit Theory Laboratory Manual",
    department: "Department of Electrical & Information Engineering",
    semester: "Semester 3",
    labName: "Electronics and Measurement Laboratory",
    location: "Block A, 2nd Floor",
    description: "Fundamental circuit network theorems, transient analysis of RLC networks, and resonant circuit quality factor evaluation.",
    recommendedEquipment: [
      "Rigol DS1054Z Digital Storage Oscilloscope",
      "Rigol DG1022Z Function Generator",
      "Fluke 87V Digital Multimeter",
      "Decade Resistance, Inductance, and Capacitance Substitution Boxes",
    ],
    practicals: [
      {
        number: 1,
        title: "Verification of Thevenin's, Norton's Theorems and Maximum Power Transfer",
        objective: "Determine open-circuit voltage (Vth), short-circuit current (In), and equivalent resistance (Rth) of a multi-source linear DC network, and verify RL = Rth for Pmax.",
        componentsAndEquipment: ["DC Power Supply", "Resistors (1k, 2.2k, 3.3k, 4.7k)", "Decade Resistance Box", "Fluke 87V DMM"],
        circuitSetup: "Assemble resistive bridge network with two DC sources (+12V and +5V). Designate load terminals A and B.",
        procedure: [
          "Disconnect load resistor RL. Measure open-circuit voltage Vth across terminals A-B using Fluke 87V.",
          "Replace DC voltage sources with their internal resistances (short circuits). Measure Rth across A-B.",
          "Connect variable decade resistance box as RL. Vary RL from 100 Ω to 10 kΩ and measure load voltage VL and load current IL.",
          "Compute load power PL = VL * IL. Plot PL vs RL and identify peak power point.",
        ],
        measurementGuide: [
          "Confirm that maximum power occurs precisely when RL equals measured Rth.",
        ],
        troubleshootingScenarios: [
          "Scenario A: Theoretical and experimental Vth differ by > 5% -> Account for multimeter internal input impedance (10 MΩ) in high-resistance dividers.",
        ],
        safetyRules: ["Turn off power when measuring resistance directly with ohmmeter to avoid blowing meter fuse."],
      },
    ],
  },
  "EE3501-comm": {
    id: "EE3501-comm",
    courseCode: "EE3501",
    title: "Communication Systems Engineering Laboratory Manual",
    department: "Department of Electrical & Information Engineering",
    semester: "Semester 6",
    labName: "Communication and Systems Engineering Laboratory",
    location: "Block B, 1st Floor",
    description: "Covers RF signal modulation, superheterodyne receivers, spectrum analysis, and Software Defined Radio (USRP) transmission.",
    recommendedEquipment: [
      "Ettus Research USRP B210 Software Defined Radio",
      "Rohde & Schwarz FSH8 Handheld Spectrum Analyzer (9 kHz - 8 GHz)",
      "Keysight N5181A MXG RF Analog Signal Generator",
      "High-Frequency 50Ω Coaxial SMA Cables and Attenuators",
    ],
    practicals: [
      {
        number: 1,
        title: "Amplitude Modulation (AM/DSB-SC) and Spectrum Analysis",
        objective: "Generate standard AM and DSB-SC modulated signals, measure modulation index (m), sideband power distribution, and spectral bandwidth.",
        componentsAndEquipment: ["Keysight N5181A RF Generator", "Rigol DG1022Z Generator", "Rohde & Schwarz FSH8", "Rigol DS1054Z"],
        circuitSetup: "Carrier fc = 10 MHz (from Keysight N5181A), Message fm = 10 kHz (from Rigol DG1022Z). Connect to analog multiplier module. Route output to Spectrum Analyzer via 20 dB RF attenuator.",
        procedure: [
          "Observe modulated envelope on oscilloscope in time domain; determine Vmax and Vmin to compute modulation index m = (Vmax - Vmin) / (Vmax + Vmin).",
          "Observe spectral components on R&S FSH8 Spectrum Analyzer: Identify carrier peak at 10 MHz and upper/lower sidebands at (fc + fm) and (fc - fm).",
          "Verify sideband power is 6 dB below carrier for m = 1.0.",
        ],
        measurementGuide: [
          "Set Spectrum Analyzer RBW (Resolution Bandwidth) to 1 kHz and VBW to 1 kHz for clear sideband separation.",
          "Always insert 20 dB inline RF attenuator before spectrum analyzer input to prevent mixer overload.",
        ],
        troubleshootingScenarios: [
          "Scenario A: Intermodulation distortion peaks appear -> Carrier power exceeds linear mixer input; reduce RF generator output level to -10 dBm.",
        ],
        safetyRules: ["Never connect RF generator directly to spectrum analyzer without checking signal power level. Maximum input is +20 dBm."],
      },
    ],
  },
  "EE3301-digital": {
    id: "EE3301-digital",
    courseCode: "EE3301",
    title: "Digital Systems & Microcontrollers Laboratory Manual",
    department: "Department of Electrical & Information Engineering",
    semester: "Semester 5",
    labName: "24 × 7 Undergraduate Development Project Laboratory",
    location: "Block D, 4th Floor",
    description: "Embedded microcontroller programming (ARM Cortex-M4), FPGA digital logic synthesis, and enterprise network switch administration.",
    recommendedEquipment: [
      "STM32F4 Discovery ARM Cortex-M4 Development Board",
      "Altera / Xilinx FPGA Cyclone IV Development Kit",
      "Cisco Catalyst 2960 Switch & Cisco 1941 Router",
      "Tektronix MDO3104 Mixed-Signal Oscilloscope & Logic Analyzer",
    ],
    practicals: [
      {
        number: 1,
        title: "STM32 ARM Cortex-M4 Timer PWM Generation & ADC Sensor Acquisition",
        objective: "Configure hardware timers (TIM1/TIM2) for complementary PWM motor drive and setup continuous DMA-based ADC sampling.",
        componentsAndEquipment: ["STM32F4 Discovery Board", "Segger J-Link Debugger", "Rigol DS1054Z", "Rotary Potentiometer"],
        circuitSetup: "Connect Potentiometer wiper to STM32 Pin PA1 (ADC1_IN1). Connect PWM output Pin PA8 (TIM1_CH1) to Oscilloscope CH1.",
        procedure: [
          "Initialize STM32CubeIDE project for STM32F407VG microcontroller.",
          "Configure System Clock to 168 MHz using external 8 MHz crystal oscillator PLL.",
          "Set Timer 1 Prescaler = 167 and Auto-Reload Register (ARR) = 999 for 1 kHz PWM frequency.",
          "Implement ADC interrupt service routine to map 12-bit ADC value (0-4095) directly to Pulse Width Capture/Compare register (CCR1).",
          "Observe PWM duty cycle variation on oscilloscope as potentiometer is rotated from 0% to 100%.",
        ],
        measurementGuide: [
          "Use oscilloscope frequency measurement and duty cycle measurement markers for jitter verification.",
        ],
        troubleshootingScenarios: [
          "Scenario A: Timer does not generate PWM -> Ensure HAL_TIM_PWM_Start(&htim1, TIM_CHANNEL_1) is explicitly called in main initialization.",
        ],
        safetyRules: ["Do not exceed 3.3V on any STM32 GPIO input pin. Connecting 5V to non-tolerant pins will permanently destroy the microcontroller port."],
      },
    ],
  },
};

export function findLabManual(query: string): DepartmentLabManual | null {
  const q = query.toLowerCase().trim();
  for (const [key, manual] of Object.entries(DEPARTMENT_LAB_MANUALS)) {
    if (
      key.toLowerCase().includes(q) ||
      manual.courseCode.toLowerCase().includes(q) ||
      manual.title.toLowerCase().includes(q) ||
      manual.labName.toLowerCase().includes(q) ||
      q.includes(manual.courseCode.toLowerCase()) ||
      q.includes(key.toLowerCase()) ||
      q.includes(manual.title.toLowerCase())
    ) {
      return manual;
    }
  }
  return null;
}

