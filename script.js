// Add this at the top of your existing script.js file

// Theme management
const modeToggle = document.getElementById('modeToggle');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');
const body = document.body;

// Initialize theme from localStorage or prefer-color-scheme
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        enableDarkMode();
    } else {
        enableLightMode();
    }
}

function enableDarkMode() {
    body.classList.remove('light-mode');
    body.classList.add('dark-mode');
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
    localStorage.setItem('theme', 'dark');
}

function enableLightMode() {
    body.classList.remove('dark-mode');
    body.classList.add('light-mode');
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
    localStorage.setItem('theme', 'light');
}

modeToggle.addEventListener('click', () => {
    if (body.classList.contains('light-mode')) {
        enableDarkMode();
    } else {
        enableLightMode();
    }
});

// Initialize theme when page loads
document.addEventListener('DOMContentLoaded', initTheme);

// Animation helper functions
function animateElement(element, animationType = 'fade-in') {
    element.classList.add(animationType);
    setTimeout(() => {
        element.classList.remove(animationType);
    }, 500);
}

function showError(message) {
    const errorBox = document.getElementById('errorMsg');
    errorBox.textContent = message;
    errorBox.style.display = 'block';
    animateElement(errorBox, 'slide-up');
    
    setTimeout(() => {
        errorBox.style.display = 'none';
    }, 5000);
}

// Your existing code continues here with minimal modifications...
const numQubitsInput = document.getElementById('numQubits');
const basisSelector = document.getElementById('basisSelector');
const amplitudeInput = document.getElementById('amplitudeInput');
const addTermBtn = document.getElementById('addTermBtn');
const waveInput = document.getElementById('waveInput');
let histogramChart = null;

// Populate basis state dropdown dynamically
numQubitsInput.addEventListener('input', () => {
  const n = parseInt(numQubitsInput.value);
  basisSelector.innerHTML = '<option value="">-- Select basis state --</option>';
  if (Number.isInteger(n) && n >= 1 && n <= 5) {
    const totalCombinations = 1 << n;
    for (let i = 0; i < totalCombinations; i++) {
      const binStr = i.toString(2).padStart(n, '0');
      const option = document.createElement('option');
      option.value = binStr;
      option.textContent = '|' + binStr + '>';
      basisSelector.appendChild(option);
    }
  }
  waveInput.value = '';
  document.getElementById('colVector').textContent = '';
  document.getElementById('errorMsg').textContent = '';
});

function drawHistogram(counts) {
    const labels = Object.keys(counts);
    const values = Object.values(counts);

    const ctx = document.getElementById('histogram').getContext('2d');
    
    // Update colors based on theme
    const isDark = body.classList.contains('dark-mode');
    const backgroundColor = isDark ? 'rgba(59, 130, 246, 0.7)' : 'rgba(54, 162, 235, 0.7)';
    const borderColor = isDark ? 'rgba(59, 130, 246, 1)' : 'rgba(54, 162, 235, 1)';
    const textColor = isDark ? '#f1f5f9' : '#1e293b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    if (histogramChart) {
      histogramChart.data.labels = labels;
      histogramChart.data.datasets[0].data = values;
      histogramChart.data.datasets[0].backgroundColor = backgroundColor;
      histogramChart.data.datasets[0].borderColor = borderColor;
      
      // Update chart options for theme
      histogramChart.options.scales.x.ticks.color = textColor;
      histogramChart.options.scales.y.ticks.color = textColor;
      histogramChart.options.scales.x.title.color = textColor;
      histogramChart.options.scales.y.title.color = textColor;
      histogramChart.options.scales.x.grid.color = gridColor;
      histogramChart.options.scales.y.grid.color = gridColor;
      
      histogramChart.update();
      return;
    }

    histogramChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Measurement Counts',
                data: values,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                x: {
                    title: { 
                        display: true, 
                        text: 'Bitstring Outcome',
                        color: textColor
                    },
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                },
                y: {
                    beginAtZero: true,
                    title: { 
                        display: true, 
                        text: 'Counts',
                        color: textColor
                    },
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: textColor
                    }
                }
            }
        }
    });
}

/**
 * Convert a numeric or mixed vector to complex objects compatible with plotQSphere
 * @param {Array<number|object>} vector - array of numbers or objects
 * @returns {Array<{re:number, im:number}>} - complex vector
 */
function makeComplexVector(vector) {
    return vector.map(v => {
        if (typeof v === 'number') {
            return { re: v, im: 0 };        // real number → complex with im=0
        }
        if (v && typeof v.re === 'number' && typeof v.im === 'number') {
            return v;                       // already complex
        }
        // fallback if invalid value
        return { re: 0, im: 0 };
    });
}

function plotQSphere(divId, stateVec) {
  const nQ = Math.log2(stateVec.length);
  const spikeTraces = [];
  const tipTraces = [];
  const latitudeTraces = [];
  const labelX = [];
  const labelY = [];
  const labelZ = [];
  const labelText = [];

  const coords = [];
  const phases = [];
  const probs = [];
  const arcTraces = [];

  // --- Compute spike positions ---
  for (let i = 0; i < stateVec.length; i++) {
    const amp = stateVec[i];
    const re = amp.re, im = amp.im;
    const prob = re*re + im*im;
    const phase = Math.atan2(im, re);
    const weightStr = i.toString(2).padStart(nQ,'0');

    // --- evenly distribute states on sphere ---
    const hamming = weightStr.split('').filter(q => q==='1').length;
    const theta = (hamming / nQ) * Math.PI;           // latitude by Hamming weight
    const phi = 2 * Math.PI * i / stateVec.length;   // evenly around longitude

    const r = 1.0;
    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(theta);

    coords.push([x, y, z]);
    phases.push(phase);
    probs.push(prob);

    labelX.push(x);
    labelY.push(y);
    labelZ.push(z);
    labelText.push(`|${weightStr}⟩`);

    // radial line
    spikeTraces.push({
      type:"scatter3d",
      mode:"lines",
      x:[0, x], y:[0, y], z:[0, z],
      line:{color:`hsl(${(phase*180/Math.PI+360)%360},80%,50%)`, width:1 + 8*prob},
      opacity:0.8,
      hoverinfo:"skip",
      showlegend : false
    });

    // tip marker for hover text
    tipTraces.push({
      type: "scatter3d",
      mode: "markers",
      x: [x], y: [y], z: [z],
      marker: {size: 5 + 20*prob, color:`hsl(${(phase*180/Math.PI+360)%360},80%,40%)`},
      text: `|${weightStr}⟩<br>amp=${re.toFixed(2)} + ${im.toFixed(2)}i<br>P=${prob.toFixed(2)}<br>phase=${phase.toFixed(2)}`,
      hoverinfo: "text",
      showlegend : false
    });
  }
  // --- Latitude circles ---
  const SPHERE_POINTS = 60;
  for (let k = 0; k <= nQ; k++) {
    const theta = (k / nQ) * Math.PI;
    const latX = [], latY = [], latZ = [];
    for (let p = 0; p <= SPHERE_POINTS; p++) {
      const phi = (p / SPHERE_POINTS) * 2 * Math.PI;
      latX.push(Math.sin(theta)*Math.cos(phi));
      latY.push(Math.sin(theta)*Math.sin(phi));
      latZ.push(Math.cos(theta));
    }
    latitudeTraces.push({
      type:"scatter3d",
      mode:"lines",
      x:latX, y:latY, z:latZ,
      line:{color:"gray", width:1},
      opacity:0.2,
      hoverinfo:"skip",
      showlegend:false
    });
  }

  // --- Transparent sphere ---
  const U = 30, V = 30;
  const xs = [], ys = [], zs = [];
  for (let i = 0; i <= U; i++) {
    const theta = Math.PI * i / U;
    const rowX = [], rowY = [], rowZ = [];
    for (let j = 0; j <= V; j++) {
      const phi = 2*Math.PI*j/V;
      rowX.push(Math.sin(theta)*Math.cos(phi));
      rowY.push(Math.sin(theta)*Math.sin(phi));
      rowZ.push(Math.cos(theta));
    }
    xs.push(rowX); ys.push(rowY); zs.push(rowZ);
  }

  const sphereSurface = {
    type:'surface', x:xs, y:ys, z:zs,
    opacity:0.2,
    colorscale:[[0,'rgba(228,246,253,0.87)'], [1,'rgba(248,200,244,0.5)']],
    showscale:false,
    contours: {
      x: { show: true, color: "#5a56568a", width: 20 },
      y: { show: true, color: "#5a565680", width: 20},
      z: { show: true, color: "#5a565685", width:20 }
    },
    hoverinfo:'skip',
    showlegend:false
  };

  const labelTraces = {
    type:"scatter3d",
    mode:"text",
    x:labelX, y:labelY, z:labelZ,
    text:labelText,
    textposition:"top center",
    textfont:{size:12, color:"#333333"},
    hoverinfo:"skip",
    showlegend:false
  };
  const layout = {
    title:"Q-Sphere <br> size(Dot)-> probability<br> color(Dot)->Phase",
    margin:{l:0,r:0,b:0,t:30},
    scene:{
      aspectmode:'cube',
      xaxis:{range:[-1.3,1.3],showgrid:false,zeroline:false,showticklabels:false,visible:false},
      yaxis:{range:[-1.3,1.3],showgrid:false,zeroline:false,showticklabels:false,visible:false},
      zaxis:{range:[-1.3,1.3],showgrid:false,zeroline:false,showticklabels:false,visible:false},
      camera:{eye:{x:0.8,y:0.8,z:0.8}}
    },
  };

  Plotly.newPlot(divId, [sphereSurface, ...latitudeTraces, ...spikeTraces, ...tipTraces, labelTraces], layout);
}

//circuit printing
function renderCircuit(numQubits, gates) {
  const container = document.getElementById("circuitContainer");
  const numClassical = numQubits;
  container.innerHTML = "";
  container.innerHTML += "<h2>Circuit Diagram</h2>";

  const width = 120 * (gates.length + 1);
  const qheight = 60 ;
  const cHeight = 40;
  const height = numQubits * qheight + numClassical * cHeight + 60;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);

  // Get current theme colors
  const isDark = body.classList.contains('dark-mode');
  const strokeColor = isDark ? '#f1f5f9' : '#000000';
  const textColor = isDark ? '#f1f5f9' : '#000000';
  const gateColor = isDark ? '#374151' : '#d1e7dd';

  // --- Draw wires ---
  for (let q = 0; q < numQubits; q++) {
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", 20);
    line.setAttribute("y1", 30 + q * qheight);
    line.setAttribute("x2", width - 20);
    line.setAttribute("y2", 30 + q * qheight);
    line.setAttribute("stroke", strokeColor);
    line.setAttribute("stroke-width", "2");
    svg.appendChild(line);

    // Label
    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", 0);
    text.setAttribute("y", 35 + q * qheight);
    text.setAttribute("fill", textColor);
    text.textContent = `q${q}`;
    svg.appendChild(text);
  }
  for (let q = 0; q < numQubits; q++) {
    const y = 30 + q * qheight;
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", 20);
    line.setAttribute("y1", y);
    line.setAttribute("x2", width - 20);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", strokeColor);
    line.setAttribute("stroke-width", "2");
    svg.appendChild(line);

    // Quantum labels
    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", 0);
    text.setAttribute("y", y + 5);
    text.setAttribute("fill", textColor);
    text.textContent = `q${q}`;
    svg.appendChild(text);
  }
  const startY = numQubits * qheight + 50;
  // --- Draw classical registers ---
  for (let c = 0; c < numClassical; c++) {
    const y = startY + c * cHeight;
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", 20);
    line.setAttribute("y1", y);
    line.setAttribute("x2", width - 20);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "blue");
    line.setAttribute("stroke-width", "2");
    svg.appendChild(line);

    // Classical labels
    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", 0);
    text.setAttribute("y", y + 5);
    text.setAttribute("fill", textColor);
    text.textContent = `cr[${c}]`;
    svg.appendChild(text);
  }


  // --- Draw gates ---
  gates.forEach((g, i) => {
    const x = 100 + i * 120;

    // 🎯 Handle single-qubit standard + rotation gates
    if (["X", "Y", "Z", "H", "S", "T", "SDG", "TDG", "RX", "RY", "RZ", "PHASE"].includes(g.type)) {
      const qTarget = g.params[0];
      const y = 30 + qTarget * qheight;

      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", x - 25);
      rect.setAttribute("y", y - 25);
      rect.setAttribute("width", 50);
      rect.setAttribute("height", 50);
      rect.setAttribute("fill", gateColor);
      rect.setAttribute("stroke", strokeColor);
      svg.appendChild(rect);

      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("x", x);
      label.setAttribute("y", y);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("font-size", "14");
      label.setAttribute("dominant-baseline", "middle");
      label.setAttribute("fill", textColor);

      // Show gate + angle if rotation
      if (["RX", "RY", "RZ", "PHASE"].includes(g.type)) {
        const angleDeg = g.angle ? (g.angle * 180 / Math.PI).toFixed(1) : "";
        label.textContent = `${g.type}${angleDeg ? `(${angleDeg}°)` : ""}`;
        
      } else {
        label.textContent = g.type;
      }

      svg.appendChild(label);
    }

    // CNOT
    if (g.type === "CNOT") {
      const c = g.params[0];
      const t = g.params[1];
      const yc = 30 + c * qheight;
      const yt = 30 + t * qheight;

      const dot = document.createElementNS(svgNS, "circle");
      dot.setAttribute("cx", x);
      dot.setAttribute("cy", yc);
      dot.setAttribute("r", 6);
      dot.setAttribute("fill", strokeColor);
      svg.appendChild(dot);

      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", yt);
      circle.setAttribute("r", 12);
      circle.setAttribute("stroke", strokeColor);
      circle.setAttribute("fill", isDark ? "#1e293b" : "white");
      svg.appendChild(circle);

      const lineV = document.createElementNS(svgNS, "line");
      lineV.setAttribute("x1", x);
      lineV.setAttribute("y1", yc);
      lineV.setAttribute("x2", x);
      lineV.setAttribute("y2", yt);
      lineV.setAttribute("stroke", strokeColor);
      lineV.setAttribute("stroke-width", "2");
      svg.appendChild(lineV);

      const lineH = document.createElementNS(svgNS, "line");
      lineH.setAttribute("x1", x - 10);
      lineH.setAttribute("y1", yt);
      lineH.setAttribute("x2", x + 10);
      lineH.setAttribute("y2", yt);
      lineH.setAttribute("stroke", strokeColor);
      lineH.setAttribute("stroke-width", "2");
      svg.appendChild(lineH);

      const lineV2 = document.createElementNS(svgNS, "line");
      lineV2.setAttribute("x1", x);
      lineV2.setAttribute("y1", yt - 10);
      lineV2.setAttribute("x2", x);
      lineV2.setAttribute("y2", yt + 10);
      lineV2.setAttribute("stroke", strokeColor);
      lineV2.setAttribute("stroke-width", "2");
      svg.appendChild(lineV2);
    }
    //cz
    // CZ
if (g.type === "CZ") {
  const c = g.params[0];
  const t = g.params[1];
  const yc = 30 + c * qheight;
  const yt = 30 + t * qheight;

  // Control dot
  const dotC = document.createElementNS(svgNS, "circle");
  dotC.setAttribute("cx", x);
  dotC.setAttribute("cy", yc);
  dotC.setAttribute("r", 6);
  dotC.setAttribute("fill", strokeColor);
  svg.appendChild(dotC);

  // Target dot
  const dotT = document.createElementNS(svgNS, "circle");
  dotT.setAttribute("cx", x);
  dotT.setAttribute("cy", yt);
  dotT.setAttribute("r", 6);
  dotT.setAttribute("fill", strokeColor);
  svg.appendChild(dotT);

  // Vertical line connecting them
  const lineV = document.createElementNS(svgNS, "line");
  lineV.setAttribute("x1", x);
  lineV.setAttribute("y1", yc);
  lineV.setAttribute("x2", x);
  lineV.setAttribute("y2", yt);
  lineV.setAttribute("stroke", strokeColor);
  lineV.setAttribute("stroke-width", "2");
  svg.appendChild(lineV);
}

    // SWAP
    if (g.type === "SWAP") {
      const a = g.params[0];
      const b = g.params[1];
      const ya = 30 + a * qheight;
      const yb = 30 + b * qheight;

      const line1 = document.createElementNS(svgNS, "line");
      line1.setAttribute("x1", x - 10);
      line1.setAttribute("y1", ya - 10);
      line1.setAttribute("x2", x + 10);
      line1.setAttribute("y2", ya + 10);
      line1.setAttribute("stroke", strokeColor);
      line1.setAttribute("stroke-width", "2");
      svg.appendChild(line1);

      const line2 = document.createElementNS(svgNS, "line");
      line2.setAttribute("x1", x - 10);
      line2.setAttribute("y1", ya + 10);
      line2.setAttribute("x2", x + 10);
      line2.setAttribute("y2", ya - 10);
      line2.setAttribute("stroke", strokeColor);
      line2.setAttribute("stroke-width", "2");
      svg.appendChild(line2);

      const line3 = document.createElementNS(svgNS, "line");
      line3.setAttribute("x1", x - 10);
      line3.setAttribute("y1", yb - 10);
      line3.setAttribute("x2", x + 10);
      line3.setAttribute("y2", yb + 10);
      line3.setAttribute("stroke", strokeColor);
      line3.setAttribute("stroke-width", "2");
      svg.appendChild(line3);

      const line4 = document.createElementNS(svgNS, "line");
      line4.setAttribute("x1", x - 10);
      line4.setAttribute("y1", yb + 10);
      line4.setAttribute("x2", x + 10);
      line4.setAttribute("y2", yb - 10);
      line4.setAttribute("stroke", strokeColor);
      line4.setAttribute("stroke-width", "2");
      svg.appendChild(line4);

      const lineV = document.createElementNS(svgNS, "line");
      lineV.setAttribute("x1", x);
      lineV.setAttribute("y1", ya);
      lineV.setAttribute("x2", x);
      lineV.setAttribute("y2", yb);
      lineV.setAttribute("stroke", strokeColor);
      lineV.setAttribute("stroke-width", "2");
      svg.appendChild(lineV);
    }

    // Toffoli (CCNOT)
    if (g.type === "CCNOT") {
      const c1 = g.params[0];
      const c2 = g.params[1];
      const t = g.params[2];
      const y1 = 30 + c1 * qheight;
      const y2 = 30 + c2 * qheight;
      const yt = 30 + t * qheight;

      [y1, y2].forEach(yc => {
        const dot = document.createElementNS(svgNS, "circle");
        dot.setAttribute("cx", x);
        dot.setAttribute("cy", yc);
        dot.setAttribute("r", 6);
        dot.setAttribute("fill", strokeColor);
        svg.appendChild(dot);
      });

      const lineV = document.createElementNS(svgNS, "line");
      lineV.setAttribute("x1", x);
      lineV.setAttribute("y1", Math.min(y1, y2));
      lineV.setAttribute("x2", x);
      lineV.setAttribute("y2", yt);
      lineV.setAttribute("stroke", strokeColor);
      lineV.setAttribute("stroke-width", "2");
      svg.appendChild(lineV);

      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", yt);
      circle.setAttribute("r", 12);
      circle.setAttribute("stroke", strokeColor);
      circle.setAttribute("fill", isDark ? "#1e293b" : "white");
      svg.appendChild(circle);

      const lineH = document.createElementNS(svgNS, "line");
      lineH.setAttribute("x1", x - 10);
      lineH.setAttribute("y1", yt);
      lineH.setAttribute("x2", x + 10);
      lineH.setAttribute("y2", yt);
      lineH.setAttribute("stroke", strokeColor);
      lineH.setAttribute("stroke-width", "2");
      svg.appendChild(lineH);

      const lineV2 = document.createElementNS(svgNS, "line");
      lineV2.setAttribute("x1", x);
      lineV2.setAttribute("y1", yt - 10);
      lineV2.setAttribute("x2", x);
      lineV2.setAttribute("y2", yt + 10);
      lineV2.setAttribute("stroke", strokeColor);
      lineV2.setAttribute("stroke-width", "2");
      svg.appendChild(lineV2);
    }
    if (g.type === "MEASURE") {
    }
    if(g.type != "MEASURE"){
          // --- Draw identity gates for qubits not affected by this gate ---
      for (let q = 0; q < numQubits; q++) {
        let isTarget = false;

        if (["X","Y","Z","H","S","T","SDG","TDG","RX","RY","RZ","PHASE","MEASURE"].includes(g.type)) {
          isTarget = (q === g.params[0]);
        } else if (["CNOT", "CZ"].includes(g.type)) {
          isTarget = (q === g.params[0] || q === g.params[1]);
        } else if (g.type === "CCNOT") {
          isTarget = (q === g.params[0] || q === g.params[1] || q === g.params[2]);
        } else if (g.type === "MEASURE") {
          isTarget = (q === g.params[0]);
        }else if (g.type === "SWAP"){
          isTarget = (q === g.params[0] || q === g.params[1]);
        }
        if (!isTarget) {
          const y = 30 + q * qheight;
          const rect = document.createElementNS(svgNS, "rect");
          rect.setAttribute("x", x - 15);
          rect.setAttribute("y", y - 15);
          rect.setAttribute("width", 30);
          rect.setAttribute("height", 30);
          rect.setAttribute("fill", isDark ? "#374151" : "#f0f0f0");  // theme-aware identity gate color
          rect.setAttribute("stroke", strokeColor);
          svg.appendChild(rect);

          const label = document.createElementNS(svgNS, "text");
          label.setAttribute("x", x);
          label.setAttribute("y", y);
          label.setAttribute("text-anchor", "middle");
          label.setAttribute("dominant-baseline", "middle");
          label.setAttribute("font-size", "12");
          label.setAttribute("fill", textColor);
          label.textContent = "I";
          svg.appendChild(label);
        }
      }
    }
  });

  container.appendChild(svg);
}

function convertBackendToCircuitGates(backendGates) {
  return backendGates.map(g => {
    const type = g.gate.toUpperCase();
    if (["X","Y","Z","H","S","T"].includes(g.gate)) {
      return { type: g.gate, params: g.qubits };
    }
    if (["RX","RY","RZ"].includes(g.gate)) {
      return { type: g.gate, params: g.qubits, angle: g.angle };
    }
    if (g.gate === "CNOT") {
      return { type: "CNOT", params: [g.control, g.target] };
    }
    if (g.gate === "CZ") {
      return { type: "CZ", params: [g.control, g.target] };
    }
    if (g.gate === "CCNOT") {
      return { type: "CCNOT", params: [g.control1, g.control2, g.target] };
    }
    if (g.gate === "SWAP") {
      return { type: "SWAP", params: [g.q1, g.q2] };
    }
    if (g.gate === "MEASURE") {
      return { type: "MEASURE", params: [g.qubit, g.clbit] };
    }
    return null; // ignore unknown
  }).filter(Boolean);
}

// Add a term to the wavefunction input when button clicked
addTermBtn.addEventListener('click', () => {
  const basis = basisSelector.value;
  const amplitude = amplitudeInput.value.trim();

  if (basis === '' || amplitude === '') return;

  const term = `(${amplitude})|${basis}>`;
  waveInput.value = waveInput.value? waveInput.value + ' + ' + term: term;

  amplitudeInput.value = '';
  basisSelector.selectedIndex = 0;
  
  // Add animation feedback
  animateElement(addTermBtn, 'slide-up');
});

const btn = document.getElementById('convertBtn');
btn.addEventListener('click', convertWavefunction);

function convertWavefunction() {
  var n = parseInt(document.getElementById('numQubits').value, 10);
  var wf = document.getElementById('waveInput').value || '';
  var errorBox = document.getElementById('errorMsg');
  var out = document.getElementById('colVector');

  // Clear previous output and errors
  errorBox.textContent = '';
  errorBox.style.display = 'none';
  out.textContent = '';

  if (!Number.isInteger(n) || n < 1 || n > 5) {
    showError('⚠ Enter a valid number of qubits (between 1 and 5).');
    return;
  }

  var dim = 1 << n; // 2^n
  var vector = new Array(dim).fill(0);

  var termRegex = /([+-]?\s*(?:\([^\)]+\)|[0-9.]+(?:e[+-]?\d+)?(?:i[0-9.+-]+)?))?\s*\|\s*([01]+)\s*>/g;
  var m;
  var anyMatch = false;
  var invalidTerms = [];

  while ((m = termRegex.exec(wf)) !== null) {
    anyMatch = true;

    var rawCoeff = (m[1] || '').trim();
    if (rawCoeff === '' || rawCoeff === '+') rawCoeff = '1';
    if (rawCoeff === '-') rawCoeff = '-1';

    rawCoeff = rawCoeff.replace(/[()]/g, '').replace(/^\+/, '');

    var basis = (m[2] || '').trim();

    if (basis.length > n) {
      invalidTerms.push('|' + basis + '>');
      continue;
    }

    var padded = basis.padStart(n, '0');
    var index = parseInt(padded, 2);

    if (!isNaN(index) && index < dim) {
      var num = parseFloat(rawCoeff);
      vector[index] = isNaN(num) ? rawCoeff : num;
    }
  }

  if (!anyMatch) {
    var zeros = '0'.repeat(n);
    var ones = '1'.repeat(n);
    showError(
      '⚠ No valid terms found. Example for ' +
      n + ' qubit(s): (0.7)|' + zeros + '> + (0.7)|' + ones + '>'
    );
  }

  if (invalidTerms.length > 0) {
    showError(
      '⚠ Invalid basis states: ' + invalidTerms.join(', ') +
      ' (expected ' + n + '-qubit states like |' +
      '0'.repeat(n) + '>, |' + '1'.repeat(n) + '>, etc.)'
    );
  }
     // Validate normalization: sum of squares of amplitudes ≈ 1
  const sumSquares = vector.reduce((acc, val) => acc + (typeof val === 'number' ? val * val : 0), 0);
  if (sumSquares < 0.99 || sumSquares > 1.01) {
    showError(
      `⚠ Error: Invalid normalization. The sum of squares of amplitudes is ${sumSquares.toFixed(4)}. It should be approximately 1 (tolerance ±0.01).`
    );
    vector = new Array(dim).fill(0);
  }
  out.textContent = '[' + vector.join(', ') + ']';
  
  // Add loading animation
  const convertBtn = document.getElementById('convertBtn');
  const originalText = convertBtn.textContent;
  convertBtn.textContent = 'Converting...';
  convertBtn.disabled = true;

  fetch("https://state-to-circuit.onrender.com/prepare_state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      num_qubits: n,
      amplitudes: vector,
      initial_basis: "0".repeat(n),
      optimized: true   // or false if you want full circuit
    })
  })
  .then(res => res.json())
  .then(data => {
  // Convert backend gates → circuit gates
  const circuitGates = convertBackendToCircuitGates(data.gate_sequence);

    // Draw SVG circuit
  renderCircuit(data.num_qubits, circuitGates);

  let output = "";
  if (data.gate_sequence && data.gate_sequence.length > 0) {
    data.gate_sequence.forEach(step => {
      if (step.gate === "CNOT") {
        output += `${step.step}. Apply CNOT (control q${step.control} → target q${step.target})\n`;
      } else if (["RX","RY","RZ"].includes(step.gate)) {
        output += `${step.step}. Apply ${step.gate}(${step.angle.toFixed(6)}) on qubits ${step.qubits.join(", ")}\n`;
      } else {
        output += `${step.step}. Apply ${step.gate} on qubits ${step.qubits.join(", ")}\n`;
      }
    });
  } else {
    output = "⚠ No gates returned by backend.";
  }
const complexVec = makeComplexVector(vector);  // `vector` is your numeric array
plotQSphere('qsphereDiv', complexVec);

  document.getElementById("backendOutput").textContent = output;
  drawHistogram(data.counts);
  
  // Restore button
  convertBtn.textContent = originalText;
  convertBtn.disabled = false;
  animateElement(convertBtn, 'slide-up');
})
  .catch(err => {
    document.getElementById("backendOutput").textContent =
      "❌ Backend error: " + err;
    // Restore button on error too
    convertBtn.textContent = originalText;
    convertBtn.disabled = false;
  });
}