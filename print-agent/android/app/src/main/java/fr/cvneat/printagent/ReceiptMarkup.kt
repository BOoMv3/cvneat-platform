package fr.cvneat.printagent

/**
 * Convertit le markup DantSu ([C]/[L]/[R], <b>, …) en texte brut
 * compatible avec l'imprimante interne Sunmi.
 */
object ReceiptMarkup {
  fun toPlainText(formatted: String): String {
    if (formatted.isBlank()) return ""

    val lines = formatted.replace("\r\n", "\n").replace('\r', '\n').split('\n')
    val out = StringBuilder()

    for (rawLine in lines) {
      var line = rawLine
        .replace(Regex("</?b>", RegexOption.IGNORE_CASE), "")
        .replace(Regex("</?font[^>]*>", RegexOption.IGNORE_CASE), "")
        .replace(Regex("<img[^>]*>", RegexOption.IGNORE_CASE), "")

      val align = when {
        line.contains("[C]") -> "C"
        line.contains("[R]") -> "R"
        else -> "L"
      }

      line = line
        .replace("[C]", "")
        .replace("[L]", "")
        .replace("[R]", "")
        .replace("[N]", "\n")
        .trim()

      // Lignes "libellé[R]montant" → "libellé …… montant"
      if (rawLine.contains("[R]") && !rawLine.trimStart().startsWith("[R]")) {
        val parts = rawLine
          .replace(Regex("</?b>", RegexOption.IGNORE_CASE), "")
          .replace("[C]", "")
          .replace("[L]", "")
          .split("[R]")
        if (parts.size >= 2) {
          val left = parts[0].trim()
          val right = parts.drop(1).joinToString(" ").trim()
          line = padColumns(left, right, 32)
        }
      } else if (align == "C" && line.isNotEmpty()) {
        line = center(line, 32)
      } else if (align == "R" && line.isNotEmpty()) {
        line = line.padStart(32).takeLast(32)
      }

      out.append(line).append('\n')
    }

    // Avance papier pour couper proprement sur Sunmi V2 Pro
    out.append("\n\n\n")
    return out.toString()
  }

  private fun center(text: String, width: Int): String {
    if (text.length >= width) return text
    val left = (width - text.length) / 2
    return " ".repeat(left) + text
  }

  private fun padColumns(left: String, right: String, width: Int): String {
    val maxLeft = (width - right.length - 1).coerceAtLeast(8)
    val l = if (left.length > maxLeft) left.take(maxLeft - 1) + "…" else left
    val spaces = (width - l.length - right.length).coerceAtLeast(1)
    return l + " ".repeat(spaces) + right
  }
}
