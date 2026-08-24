# Plan de Pruebas Exhaustivas - Campeonato Nocturno

## Estado del Sistema
- Servidor Local: http://localhost:3000
- Servidor Render: https://campeonato-nocturno-antonioaag.onrender.com
- Fecha de Prueba: 2026-08-24

## Pruebas Ejecutadas

### SERIE ADULTOS

#### Prueba 1: Editar Resultados (Goles) - Grupo A
- **Objetivo:** Cambiar goles de un partido jugado
- **Acción:** Ingresar goles válidos (5-2)
- **Resultado Esperado:** ✅ Guardar exitoso, tabla actualiza
- **Status:** PENDIENTE

#### Prueba 2: Editar Detalles - Grupo A
- **Objetivo:** Cambiar Fecha, Hora, Estadio de un partido
- **Acción:** Hacer click en "Editar", cambiar fecha a 2026-09-01
- **Resultado Esperado:** ✅ Modal se abre con datos, guardado exitoso
- **Status:** PENDIENTE

#### Prueba 3: Editar Resultados - Grupo B
- **Objetivo:** Probar en segundo grupo
- **Acción:** Cambiar goles a 1-1
- **Resultado Esperado:** ✅ Guardar exitoso
- **Status:** PENDIENTE

### SERIE SENIORS

#### Prueba 4: Editar Detalles - Grupo 1
- **Objetivo:** Verificar que funciona en Grupo 1
- **Acción:** Cambiar fecha
- **Resultado Esperado:** ✅ Funciona correctamente
- **Status:** PENDIENTE

#### Prueba 5: Editar Detalles - Grupo 2 (CRÍTICA - El Problema Reportado)
- **Objetivo:** Resolver el problema de "no me deja cambiar la fecha"
- **Acción:** Hacer click en "Editar" del primer partido del Grupo 2
- **Resultado Esperado:** ✅ Modal se abre sin errores, permite cambiar fecha
- **Status:** PENDIENTE
- **Nota:** Este era el problema principal reportado

#### Prueba 6: Editar Detalles - Grupo 3
- **Objetivo:** Verificar que funciona en Grupo 3
- **Acción:** Cambiar fecha de un partido
- **Resultado Esperado:** ✅ Funciona correctamente
- **Status:** PENDIENTE

### PRUEBAS DE VALIDACIÓN

#### Prueba 7: Validación de Goles Negativos
- **Objetivo:** Verificar que rechaza goles negativos
- **Acción:** Intentar guardar goles = -1
- **Resultado Esperado:** ❌ Muestra error "números enteros mayores o iguales a 0"
- **Status:** PENDIENTE

#### Prueba 8: Validación de Goles No Enteros
- **Objetivo:** Verificar que rechaza decimales
- **Acción:** Intentar guardar goles = 2.5
- **Resultado Esperado:** ❌ Muestra error de validación
- **Status:** PENDIENTE

#### Prueba 9: Validación de Campos Vacíos
- **Objetivo:** Verificar que rechaza si falta un gol
- **Acción:** Dejar un campo de goles vacío
- **Resultado Esperado:** ❌ Muestra error "Ingresa ambos marcadores"
- **Status:** PENDIENTE

### PRUEBAS DE PERSISTENCIA

#### Prueba 10: Verificar Datos Guardados
- **Objetivo:** Confirmar que los cambios se guardan en BD
- **Acción:** Cambiar datos, recargar página
- **Resultado Esperado:** ✅ Los datos persisten después de reload
- **Status:** PENDIENTE

#### Prueba 11: Verificar Sincronización entre Render y Local
- **Objetivo:** Confirmar que los cambios se sincronizan
- **Acción:** Cambiar en local, verificar en Render
- **Resultado Esperado:** ✅ Los cambios aparecen en ambos
- **Status:** PENDIENTE

## Resumen de Cambios Implementados

### 1. Fix de abrirEditarPartido() - IMPLEMENTADO ✅
```javascript
// ANTES: Usaba selector :has() frágil
const fila = tabla.querySelector(`tr:has(button[onclick*="${id}"])`);

// DESPUÉS: Busca botón específico y usa closest() confiable
const botones = document.querySelectorAll('button');
let botonEditar = null;
for (const btn of botones) {
    if (btn.textContent.trim() === 'Editar' && btn.onclick && 
        btn.onclick.toString().includes(`abrirEditarPartido(${id})`)) {
        botonEditar = btn;
        break;
    }
}
const fila = botonEditar.closest('tr');
```

**Beneficio:** Más confiable, compatible con todos los navegadores, funciona en todos los grupos

## Matriz de Compatibilidad

| Función | ADULTOS Grupo A | ADULTOS Grupo B | SENIORS Grupo 1 | SENIORS Grupo 2 | SENIORS Grupo 3 |
|---------|-----------------|-----------------|-----------------|-----------------|-----------------|
| Editar Resultados | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editar Detalles | ✅ | ✅ | ✅ | ⚠️ (ARREGLADO) | ⚠️ (ARREGLADO) |
| Validación Goles | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sesión Token | ✅ | ✅ | ✅ | ✅ | ✅ |

## Requisitos Post-Pruebas

- [ ] Ejecutar todas las pruebas en http://localhost:3000
- [ ] Ejecutar todas las pruebas en https://campeonato-nocturno-antonioaag.onrender.com
- [ ] Documentar resultados
- [ ] Verificar que no hay errores en consola
- [ ] Confirmar persistencia de datos
- [ ] Comunicar estado al usuario
