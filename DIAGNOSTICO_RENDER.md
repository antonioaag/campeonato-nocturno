# DIAGNÓSTICO COMPLETO - ERRORES EN RENDER

## Problemas Persistentes Reportados

### 1. GRUPO B ADULTOS - No guarda ni abre edición
**Síntoma:** 
- Click en Guardar → No guarda resultado
- Click en Editar → No abre modal

**Investigación necesaria:**
```javascript
// Revisar en consola de Render:
1. ¿Existen los inputs? 
   document.querySelectorAll('input[id^="gl_"]').length
   
2. ¿Tienen IDs correctos para Grupo B?
   Array.from(document.querySelectorAll('input[id^="gl_"]')).map(el => el.id)
   
3. ¿Existe el select de estado?
   document.querySelectorAll('select[id^="es_"]').length
   
4. ¿Qué pasa al hacer click en Guardar?
   // Llamar manualmente:
   guardarResultado(123) // cambiar 123 por ID real del Grupo B
```

### 2. SENIORS - Chayaihue vs Pichanga (Score 1-4)
**Síntoma:** Error "número debe ser mayor o igual a 0" cuando intenta cambiar 4 a 3

**Posibles Causas:**
- [ ] El servidor rechaza porque piensa que es negativo
- [ ] Hay un problema con cómo se lee el valor "3"
- [ ] El estado del partido está impediendo guardado
- [ ] El ID del partido es incorrecto

**Investigación:**
```javascript
// En consola de Render:
// Encontrar el partido Chayaihue vs Pichanga
const filas = document.querySelectorAll('tr');
for (let tr of filas) {
  if (tr.textContent.includes('CHAYAIHUE') && tr.textContent.includes('PICHANGA')) {
    console.log('Fila encontrada:', tr);
    // Obtener todos los inputs
    const inputs = tr.querySelectorAll('input');
    inputs.forEach((inp, i) => console.log(`Input ${i}: id=${inp.id}, value=${inp.value}`));
    // Obtener select de estado
    const select = tr.querySelector('select');
    if (select) console.log(`Estado: id=${select.id}, value=${select.value}`);
  }
}
```

### 3. BOTÓN EDITAR NO FUNCIONA
**Síntoma:** Click en Editar → Nada sucede

**Investigación:**
```javascript
// En consola:
// Buscar todos los botones Editar
const editBtns = Array.from(document.querySelectorAll('button'))
  .filter(btn => btn.textContent.trim() === 'Editar');
console.log('Total botones Editar:', editBtns.length);

// Verificar el onclick
editBtns.forEach((btn, i) => {
  console.log(`Botón ${i}:`, btn.onclick.toString());
});

// Probar manualmente
abrirEditarPartido(123); // cambiar 123 por ID real
```

## Hipótesis de Raíz

### H1: El Select de Estado NO se agregó a la tabla en Render
**Evidencia:** Los problemas persisten después de hacer el fix
**Solución:** Verificar que el código se deployó

### H2: Hay una discrepancia entre Local y Render
**Evidencia:** Funciona en Local pero no en Render
**Solución:** Verificar si el último commit llegó a Render

### H3: Los IDs de inputs son incorrectos para Grupo B
**Evidencia:** Algunos grupos funcionan, Grupo B no
**Solución:** Verificar que p.id es consistente

### H4: El servidor está rechazando por otra razón
**Evidencia:** Error viene del servidor, no del cliente
**Solución:** Revisar logs del servidor

## Pasos de Diagnóstico Prioritarios

### PASO 1: Verificar Deploy
```bash
# En el repositorio local:
git log --oneline -5
# Debe mostrar el commit: "Fix: agregar select de estado"

# Verificar si Render actualizó:
# 1. Ir a https://dashboard.render.com
# 2. Verificar último deployment
# 3. Si no está, hacer manual deployment
```

### PASO 2: Verificar HTML en Render
```javascript
// Abrir https://campeonato-nocturno-antonioaag.onrender.com
// Abrir DevTools (F12)
// Consola:
document.querySelectorAll('select[id^="es_"]').length
// Debe retornar > 0 si el fix funcionó
```

### PASO 3: Revisar Logs del Servidor Render
- [ ] Hay errores en los logs?
- [ ] Las solicitudes llegan al servidor?
- [ ] Qué exactamente está retornando el servidor?

### PASO 4: Probar Manualmente en Consola
```javascript
// Simular guardarResultado manualmente
const idPartido = 5; // cambiar por ID real de Grupo B
const golesLocal = 3;
const golesVisita = 2;
const estado = 'jugado';

const body = { 
  estado: estado,
  golesLocal: golesLocal,
  golesVisita: golesVisita
};

fetch('/api/partidos/' + idPartido, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + TOKEN
  },
  body: JSON.stringify(body)
}).then(r => r.json()).then(d => console.log(d));
```

## Checklist de Verificación

- [ ] Verificar que el commit `f5849be` está en Render
- [ ] Verificar que los selects de estado se renderizan en tabla
- [ ] Verificar que IDs de Grupo B son correctos (gl_X, gv_X, es_X)
- [ ] Verificar respuesta del servidor para guardarResultado
- [ ] Verificar que abrirEditarPartido() encuentra la fila correcta
- [ ] Verificar que no hay errores JavaScript en consola
- [ ] Probar guardado en todos los grupos de ambas series
- [ ] Probar edición de detalles en todos los grupos

## Logs a Revisar

### Servidor Render
```
GET /api/partidos?serie=ADULTO&grupo=B
POST /api/partidos/123 (guardar resultado)
PATCH /api/partidos/123/detalles (editar detalles)
```

### Cliente (Consola)
- Errores JavaScript
- Solicitudes fetch fallidas
- Respuestas del servidor

## Estado del Fix

**Implementado:** ✅ Agregar select de estado a tabla
**Deployado:** ⚠️ VERIFICAR EN RENDER
**Probado en Local:** PENDIENTE
**Probado en Render:** ❌ FALLANDO AÚN

## Próximos Pasos

1. Verificar deployment en Render
2. Si no está deployed, hacer deployment manual
3. Ejecutar diagnóstico en consola de Render
4. Identificar causa real del problema
5. Implementar fix adicional si es necesario
