# Your existing main.py remains exactly the same
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from qiskit import QuantumCircuit, transpile
from qiskit.circuit.library import StatePreparation
from qiskit_aer import AerSimulator
import numpy as np

# ---------------- FastAPI setup ----------------
app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # you can restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Request model ----------------
class StateInput(BaseModel):
    num_qubits: int
    amplitudes: list[float]
    initial_basis: str | None = "00"
    optimized: bool = True   # default: optimized

# ---------------- API endpoint ----------------
@app.post("/prepare_state")
def prepare_state(input_data: StateInput):
    num_qubits = input_data.num_qubits
    amplitudes = input_data.amplitudes
    optimized = input_data.optimized

    # Normalize amplitudes
    norm = np.linalg.norm(amplitudes)
    if not np.isclose(norm, 1):
        amplitudes = [a / norm for a in amplitudes]

    # Build circuit
    qc = QuantumCircuit(num_qubits)
    sp = StatePreparation(amplitudes)
    qc.append(sp, range(num_qubits))

    # Basis gates to restrict decomposition
    basis = ["h", "x", "y", "z", "cx", "ccx", "rx", "ry", "rz"]

    # Choose optimization level
    opt_level = 3 if optimized else 0
    decomposed = transpile(qc, basis_gates=basis, optimization_level=opt_level)
    decomposed.measure_all()
    simulator = AerSimulator()
    result = simulator.run(decomposed, shots=1024).result()
    counts = result.get_counts()

    # Extract gate sequence
    sequence = []
    step = 0
    for instr in decomposed.data:
        step += 1
        gate = instr.operation
        gname = gate.name
        qidx = [qc.find_bit(q).index for q in instr.qubits]

        if gname in ("rx","ry","rz"):
            angle = float(gate.params[0]) if gate.params else None
            sequence.append({
                "step": step,
                "gate": gname.upper(),
                "angle": angle,
                "qubits": qidx
            })
        elif gname == "cx":
            sequence.append({
                "step": step,
                "gate": "CNOT",
                "control": qidx[0],
                "target": qidx[1]
            })
        else:
            sequence.append({
                "step": step,
                "gate": gname.upper(),
                "qubits": qidx
            })

    return {
        "optimized": optimized,
        "num_qubits": num_qubits,
        "gate_sequence": sequence,
        "counts": counts
    }