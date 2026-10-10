#!/usr/bin/env bash
# Activa y desactiva agentes de "The Agency" (github.com/msitarzewski/agency-agents)
# para este proyecto. Solo los que están en .claude/agents/ se cargan en cada
# sesión: cada agente activo suma su descripción a TODOS los mensajes, por eso
# se activan de a pocos en vez de instalar los 282.
#
# Uso:
#   .claude/agentes.sh buscar <texto>       busca en el catálogo
#   .claude/agentes.sh activar <id> [...]   copia el agente a .claude/agents/
#   .claude/agentes.sh desactivar <id> [...]
#   .claude/agentes.sh activos
#
# El <id> es la columna "id" de .claude/CATALOGO-AGENTES.md (ej. engineering-code-reviewer).
set -euo pipefail

# Versión fija del repo de agentes: el catálogo se generó con esta, y así un
# cambio de nombre aguas arriba no rompe `activar` sin aviso.
REPO=https://github.com/msitarzewski/agency-agents.git
COMMIT=f99f6aa910a442b0197b768ce0ea7751e35e2060

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESTINO="$RAIZ/.claude/agents"
CATALOGO="$RAIZ/.claude/CATALOGO-AGENTES.md"
CACHE="${AGENCY_CACHE:-$HOME/.cache/agency-agents-$COMMIT}"

descargar() {
  [ -d "$CACHE/.git" ] && return
  echo "Descargando el repo de agentes (una vez por máquina)..." >&2
  mkdir -p "$CACHE"
  git -C "$CACHE" init -q
  git -C "$CACHE" fetch -q --depth 1 "$REPO" "$COMMIT"
  git -C "$CACHE" checkout -q FETCH_HEAD
}

case "${1:-}" in
  buscar)
    shift
    grep -i -- "${*:?falta el texto a buscar}" "$CATALOGO" | grep '^| `' || echo "Sin resultados."
    ;;
  activar)
    shift
    [ $# -gt 0 ] || { echo "Indica al menos un id." >&2; exit 1; }
    descargar
    mkdir -p "$DESTINO"
    for id in "$@"; do
      id="${id%.md}"
      archivo="$(find "$CACHE" -path "$CACHE/.git" -prune -o -name "$id.md" -print | head -1)"
      if [ -z "$archivo" ]; then
        echo "No existe el agente '$id'. Prueba: .claude/agentes.sh buscar <texto>" >&2
        continue
      fi
      cp "$archivo" "$DESTINO/$id.md"
      echo "Activado: $id"
    done
    ;;
  desactivar)
    shift
    for id in "$@"; do
      id="${id%.md}"
      if [ -f "$DESTINO/$id.md" ]; then
        rm -- "$DESTINO/$id.md"
        echo "Desactivado: $id"
      else
        echo "No estaba activo: $id" >&2
      fi
    done
    ;;
  activos)
    ls "$DESTINO" 2>/dev/null | sed 's/\.md$//' || true
    ;;
  *)
    sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
    ;;
esac
