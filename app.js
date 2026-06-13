// --- 1. CONFIGURACIÓ DE L'EQUIP (URL) ---
const urlParams = new URLSearchParams(window.location.search);
const rawTeam = urlParams.get('team') || '';
const teamParam = rawTeam.toLowerCase();

let teamName = 'Equip Desconegut';

// Assignem noms i colors (Tema) segons l'equip
if (teamParam === 'diables') {
    teamName = 'Diables (Correfoc)';
    // Colors Foc / Correfoc
    document.documentElement.style.setProperty('--primary-color', '#d84315'); 
    document.documentElement.style.setProperty('--bg-color', '#fbe9e7'); 
} else if (teamParam === 'aniversari') {
    teamName = 'Aniversari (Pau)';
    // Colors Festius / Aniversari
    document.documentElement.style.setProperty('--primary-color', '#8e24aa'); 
    document.documentElement.style.setProperty('--bg-color', '#f3e5f5'); 
} else if (teamParam === 'metge') {
    teamName = 'Metge (Medicina)';
    // Colors Clínics / Hospital
    document.documentElement.style.setProperty('--primary-color', '#00897b'); 
    document.documentElement.style.setProperty('--bg-color', '#e0f2f1'); 
}

document.getElementById('team-display').innerText = `Equip: ${teamName}`;

// --- 2. LÒGICA DE LES PESTANYES (TABS) ---
function showTab(tabId) {
    // Amagar totes les seccions
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    // Treure la classe active de tots els botons
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    // Mostrar la secció correcta i marcar el botó actiu
    document.getElementById(`tab-${tabId}`).classList.add('active');
    event.currentTarget.classList.add('active');
}

// --- 3. HORARI (SCHEDULE) ---
const schedule = [
    { start: "19:15", end: "19:30", landmark: "Ancla Platja Sant Feliu", instructions: "Lloc d'inici!" },
    { start: "19:30", end: "19:45", landmark: "Font ajuntament de Sant Feliu", instructions: "No us mulleu gaire." },
    { start: "19:45", end: "20:00", landmark: "Discoteca Abandonada", instructions: "Al Passeig de Rius i Calvet." },
    { start: "20:00", end: "20:30", landmark: "Torre Museu San Felix", instructions: "És gratis! L'última parada." }
];

function updateSchedule() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${hours}:${minutes}`;
    
    document.getElementById('current-time').innerText = `Hora: ${currentTimeStr}`;

    let currentObjective = "Estem fora d'horari o en temps lliure. Aprofiteu per fer reptes!";
    for (const slot of schedule) {
        if (currentTimeStr >= slot.start && currentTimeStr < slot.end) {
            currentObjective = `<strong style="font-size:1.2em; color:var(--primary-color);">${slot.landmark}</strong><br><br>${slot.instructions}<br><em>(Heu de marxar a les ${slot.end})</em>`;
            break;
        }
    }
    
    const objectiveElement = document.getElementById('objective-text');
    if(objectiveElement) {
        objectiveElement.innerHTML = currentObjective;
    }
}

updateSchedule();
setInterval(updateSchedule, 30000); // Actualitza cada 30 segons

// --- 4. SUPABASE I PUJADA D'IMATGES ---
       const SUPABASE_URL = 'https://ryhyimknhuhrhtxcqxwy.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5aHlpbWtuaHVocmh0eGNxeHd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDM1MjIsImV4cCI6MjA5NjkxOTUyMn0.JArfyRBfbjJMVslhHjAhjiBLXbG6eQCfSVAFDtiMK1E';
    
async function uploadPhoto(mode, inputId, btnId, statusId) {
    if (teamName === 'Equip Desconegut') {
        alert("No s'ha detectat l'equip! Assegura't de fer servir l'enllaç correcte (ex: ?team=Blau).");
        return;
    }

    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const fileInput = document.getElementById(inputId);
    const statusText = document.getElementById(statusId);
    const submitBtn = document.getElementById(btnId);

    // Determinar quin tipus de tasca és per guardar-ho a la base de dades
    let taskTypeToSave = "Ruta";
    if (mode === 'Repte') {
        // Si és un repte, agafem el nom exacte del dropdown
        taskTypeToSave = document.getElementById('repte-select').value;
    }

    if (!fileInput.files || fileInput.files.length === 0) {
        alert("Si us plau, selecciona una foto primer!");
        return;
    }

    const file = fileInput.files[0];
    const fileExt = file.name.split('.').pop();
    // Crear un nom net i únic
    const safeTaskName = taskTypeToSave.replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `${teamName}_${safeTaskName}_${Date.now()}.${fileExt}`;

    submitBtn.disabled = true;
    statusText.innerText = "Pujant foto... Un moment.";
    statusText.style.color = "orange";

    try {
        // Pujar l'arxiu a Storage
        const { data: storageData, error: storageError } = await supabaseClient.storage
            .from('gymkhana-photos')
            .upload(fileName, file);

        if (storageError) throw storageError;

        // Obtenir la URL pública
        const { data: publicUrlData } = supabaseClient.storage
            .from('gymkhana-photos')
            .getPublicUrl(fileName);
        
        const photoUrl = publicUrlData.publicUrl;

        // Inserir la fila a la Base de Dades
        const { error: dbError } = await supabaseClient
            .from('submissions')
            .insert([{ team: teamName, type: taskTypeToSave, photo_url: photoUrl }]);

        if (dbError) throw dbError;

        statusText.innerText = "Èxit! Foto enviada.";
        statusText.style.color = "green";
        fileInput.value = ""; // Netejar l'input

    } catch (error) {
        console.error(error);
        statusText.innerText = "Error pujant la foto.";
        statusText.style.color = "red";
    } finally {
        submitBtn.disabled = false;
    }
}