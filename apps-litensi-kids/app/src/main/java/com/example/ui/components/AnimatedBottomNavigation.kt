package com.example.ui.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.Home
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.IndigoPrimary
import com.example.ui.theme.SkyBlueSecondary
import com.example.ui.viewmodel.DashboardTab

private data class NavItemData(
    val tab: DashboardTab,
    val label: String,
    val icon: ImageVector,
    val testTag: String
)

@Composable
fun AnimatedBottomNavigation(
    selectedTab: DashboardTab,
    onTabSelected: (DashboardTab) -> Unit,
    modifier: Modifier = Modifier
) {
    val navItems = listOf(
        NavItemData(
            tab = DashboardTab.CHAT,
            label = "Chat",
            icon = Icons.Default.ChatBubble,
            testTag = "nav_tab_chat"
        ),
        NavItemData(
            tab = DashboardTab.BERANDA,
            label = "Beranda",
            icon = Icons.Default.Home,
            testTag = "nav_tab_beranda"
        ),
        NavItemData(
            tab = DashboardTab.PROFIL,
            label = "Profil",
            icon = Icons.Default.AccountCircle,
            testTag = "nav_tab_profil"
        )
    )

    val activeIndex = when (selectedTab) {
        DashboardTab.CHAT -> 0
        DashboardTab.BERANDA -> 1
        DashboardTab.PROFIL -> 2
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(Color.Transparent)
    ) {
        BoxWithConstraints(
            modifier = Modifier.fillMaxWidth()
        ) {
            val tabWidth = maxWidth / navItems.size

            // Animated Horizontal Offset for Active Floating Circle Indicator
            val animatedXOffset by animateDpAsState(
                targetValue = tabWidth * activeIndex + (tabWidth - 52.dp) / 2,
                animationSpec = spring(
                    dampingRatio = Spring.DampingRatioMediumBouncy,
                    stiffness = Spring.StiffnessLow
                ),
                label = "indicatorXOffset"
            )

            // Full-Width Square Bottom Navigation Bar (Flat left/right edges)
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter),
                shape = RectangleShape,
                color = Color.White,
                shadowElevation = 12.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .navigationBarsPadding()
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(60.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxSize(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            navItems.forEachIndexed { index, item ->
                                val isSelected = activeIndex == index
                                val interactionSource = remember { MutableInteractionSource() }

                                Box(
                                    modifier = Modifier
                                        .width(tabWidth)
                                        .fillMaxHeight()
                                        .clickable(
                                            interactionSource = interactionSource,
                                            indication = null
                                        ) { onTabSelected(item.tab) }
                                        .testTag(item.testTag),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.Center,
                                        modifier = Modifier.offset(y = if (isSelected) 14.dp else 0.dp)
                                    ) {
                                        if (!isSelected) {
                                            Icon(
                                                imageVector = item.icon,
                                                contentDescription = item.label,
                                                tint = Color(0xFF64748B),
                                                modifier = Modifier.size(22.dp)
                                            )
                                            Spacer(modifier = Modifier.height(2.dp))
                                        } else {
                                            Spacer(modifier = Modifier.height(8.dp))
                                        }

                                        Text(
                                            text = item.label,
                                            style = MaterialTheme.typography.labelSmall.copy(
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                                color = if (isSelected) IndigoPrimary else Color(0xFF64748B),
                                                fontSize = 11.sp
                                            )
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Floating Active Rounded Menu Circle protruding upward out of the menu bar
            Box(
                modifier = Modifier
                    .offset(x = animatedXOffset, y = (-14).dp)
                    .size(52.dp)
                    .shadow(10.dp, CircleShape, spotColor = IndigoPrimary)
                    .clip(CircleShape)
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(
                                IndigoPrimary,
                                SkyBlueSecondary
                            )
                        )
                    )
                    .clickable { onTabSelected(navItems[activeIndex].tab) },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = navItems[activeIndex].icon,
                    contentDescription = navItems[activeIndex].label,
                    tint = Color.White,
                    modifier = Modifier.size(26.dp)
                )
            }
        }
    }
}
