# DIAGNÓSTICO DE ERRORES EN RENDER

## Problemas Reportados por el Usuario

### 1. Error: "Los goles deben ser números enteros mayores o iguales a 0"
- **Contexto:** Intenta guardar 3-3 en ADULTOS Pichanga vs Flamengo
- **Esperado:** Debe guardar exitosamente (3 y 3 son enteros válidos ≥ 0)
- **Causa Probable:** 
  - [ ] El valor no se está leyendo correctamente del input
  - [ ] El estado del partido no es "jugado"
  - [ ] El ID del partido está incorrecto
  - [ ] El input tiene contenido inesperado (espacios, caracteres especiales)

### 2. Botón "Editar" no abre modal
- **Contexto:** Click en botón Editar del mismo partido
- **Esperado:** Debe abrir modal "Editar Detalles del Partido"
- **Causa Probable:**
  - [ ] La función `abrirEditarPartido()` no encuentra el botón correcto
  - [ ] El ID del partido no coincide
  - [ ] Hay un error JavaScript en la función

### 3. Grupo B no deja ingresar datos
- **Contexto:** Al querer editar partidos del grupo B
- **Esperado:** Debe permitir cambiar goles y detalles
- **Causa Probable:**
  - [ ] Los inputs de goles no tienen los IDs correctos
  - [ ] Hay una diferencia en la estructura HTML del Grupo B
  - [ ] Los botones tienen IDs incorrectos

## Plan de Diagnóstico

### Paso 1: Verificar IDs de Inputs en DOM
```javascript
// Ejecutar en consola de Render
document.querySelectorAll('input[id^="gl_"]').forEach(input => {
  console.log(`ID: ${input.id}, Value: ${input.value}, Type: ${input.type}`);
});
```

### Paso 2: Verificar Botones en DOM
```javascript
// Ejecutar en consola
document.querySelectorAll('button').forEach(btn => {
  if (btn.textContent.includes('Guardar') || btn.textContent.includes('Editar')) {
    console.log(`Button: ${btn.textContent}, onclick: ${btn.onclick}`);
  }
});
```

### Paso 3: Verificar Estado del Partido
```javascript
// Ejecutar antes de guardar
const idPartido = 123; // cambiar por ID real
const estado = document.getElementById(`es_${idPartido}`).value;
const gl = document.getElementById(`gl_${idPartido}`).value;
const gv = document.getElementById(`gv_${idPartido}`).value;
console.log(`Partido ${idPartido}: Estado=${estado}, GL=${gl}, GV=${gv}`);
```

### Paso 4: Verificar Respuesta del Servidor
```javascript
// Hacer una solicitud manualmente
const response = await fetch('/api/partidos/123', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOKEN}`
  },
  body: JSON.stringify({ estado: 'jugado', golesLocal: 3, golesVisita: 3 })
});
const data = await response.json();
console.log('Response:', data);
```

## Hipótesis Principales

### H1: IDs de Inputs Incorr​ectos
**Evidencia:** User puede guardar algunos partidos pero no otros
**Prueba:** Verificar que `document.getElementById('gl_123')` existe antes de guardar

### H2: Problema con Lectura de Valores
**Evidencia:** Error de validación en números válidos
**Prueba:** Leer `.value` de input antes de enviar

### H3: Diferencia en Estructura Entre Grupos
**Evidencia:** Grupo B no funciona, otros grupos sí
**Prueba:** Comparar HTML generado para cada grupo

### H4: Problema en Servidor
**Evidencia:** Error devuelto por servidor
**Prueba:** Enviar JSON manualmente y verificar validación

## Soluciones Propuestas

### Si es H1 o H2 (Problema de Lectura de Inputs):
```javascript
// Mejorar guardarResultado() para debug
async function guardarResultado(idPartido) {
    // Debug: verificar que los inputs existen
    const golesLocalInput = document.getElementById(`gl_${idPartido}`);
    const golesVisitaInput = document.getElementById(`gv_${idPartido}`);
    const estadoSelect = document.getElementById(`es_${idPartido}`);
    
    if (!golesLocalInput || !golesVisitaInput || !estadoSelect) {
        alert(`Error: No se encontraron inputs para el partido ${idPartido}`);
        console.error('Missing inputs:', { golesLocalInput, golesVisitaInput, estadoSelect });
        return;
    }
    
    // Resto del código...
}
```

### Si es H3 (Diferencia en Estructura):
Verificar que todos los grupos usan la misma función `pintarFilaPartidoTabla()`

### Si es H4 (Problema en Servidor):
Mejorar validación en servidor para dar más información del error

## Estado de Investigación
- [ ] Ejecutar diagnóstico en Render
- [ ] Verificar IDs en DOM
- [ ] Capturar valores exactos enviados
- [ ] Revisar respuesta del servidor
- [ ] Implementar fix
- [ ] Verificar en ambos entornos
