package com.example.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import com.example.ui.theme.EmeraldGreen
import com.example.ui.theme.IndigoPrimary
import com.example.ui.theme.SkyBlueSecondary

@Composable
fun HeroShieldCanvas(
    modifier: Modifier = Modifier.size(180.dp)
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.95f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    Box(
        modifier = modifier,
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val width = size.width
            val height = size.height
            val centerX = width / 2
            val centerY = height / 2

            // Background glowing aura
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        SkyBlueSecondary.copy(alpha = 0.35f),
                        IndigoPrimary.copy(alpha = 0.15f),
                        Color.Transparent
                    ),
                    center = Offset(centerX, centerY),
                    radius = (width / 2) * pulseScale
                ),
                radius = (width / 2) * pulseScale,
                center = Offset(centerX, centerY)
            )

            // Shield Path
            val shieldPath = Path().apply {
                moveTo(centerX, height * 0.15f)
                cubicTo(
                    width * 0.85f, height * 0.18f,
                    width * 0.9f, height * 0.45f,
                    centerX, height * 0.85f
                )
                cubicTo(
                    width * 0.1f, height * 0.45f,
                    width * 0.15f, height * 0.18f,
                    centerX, height * 0.15f
                )
                close()
            }

            // Draw Outer Shield Gradient
            drawPath(
                path = shieldPath,
                brush = Brush.linearGradient(
                    colors = listOf(IndigoPrimary, SkyBlueSecondary),
                    start = Offset(0f, 0f),
                    end = Offset(width, height)
                )
            )

            // Inner Shield
            val innerPath = Path().apply {
                moveTo(centerX, height * 0.22f)
                cubicTo(
                    width * 0.78f, height * 0.25f,
                    width * 0.82f, height * 0.46f,
                    centerX, height * 0.78f
                )
                cubicTo(
                    width * 0.18f, height * 0.46f,
                    width * 0.22f, height * 0.25f,
                    centerX, height * 0.22f
                )
                close()
            }

            drawPath(
                path = innerPath,
                color = Color.White.copy(alpha = 0.9f)
            )

            // Center Emerald Checkmark Badge
            drawCircle(
                color = EmeraldGreen,
                radius = width * 0.18f,
                center = Offset(centerX, centerY * 0.92f)
            )

            // White Star inside Badge
            val starPath = Path().apply {
                val cx = centerX
                val cy = centerY * 0.92f
                val outerRadius = width * 0.12f
                val innerRadius = width * 0.05f
                for (i in 0..9) {
                    val r = if (i % 2 == 0) outerRadius else innerRadius
                    val angle = Math.toRadians((i * 36 - 90).toDouble())
                    val x = (cx + r * Math.cos(angle)).toFloat()
                    val y = (cy + r * Math.sin(angle)).toFloat()
                    if (i == 0) moveTo(x, y) else lineTo(x, y)
                }
                close()
            }
            drawPath(path = starPath, color = Color.White)

            // Cute smiling curve on the shield
            val smilePath = Path().apply {
                moveTo(centerX - width * 0.12f, centerY * 1.35f)
                quadraticTo(
                    centerX, centerY * 1.48f,
                    centerX + width * 0.12f, centerY * 1.35f
                )
            }
            drawPath(
                path = smilePath,
                color = IndigoPrimary,
                style = Stroke(width = 6f)
            )

            // Decorative Floating Sparks / Stars around shield
            drawCircle(color = SkyBlueSecondary, radius = 8f, center = Offset(width * 0.12f, height * 0.25f))
            drawCircle(color = EmeraldGreen, radius = 6f, center = Offset(width * 0.88f, height * 0.3f))
            drawCircle(color = IndigoPrimary, radius = 10f, center = Offset(width * 0.85f, height * 0.7f))
            drawCircle(color = SkyBlueSecondary, radius = 7f, center = Offset(width * 0.15f, height * 0.75f))
        }
    }
}
