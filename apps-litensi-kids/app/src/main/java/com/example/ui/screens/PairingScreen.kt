package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.components.LitensiHeaderGradient
import com.example.ui.components.QrScannerFrame
import com.example.ui.theme.IndigoPrimary

@Composable
fun PairingScreen(
    onConnectSuccess: (code: String, pin: String, parentFallback: String, childFallback: String) -> Unit,
    isPairingLoading: Boolean = false,
    modifier: Modifier = Modifier
) {
    var selectedTabIndex by remember { mutableIntStateOf(0) }
    var manualCodeInput by remember { mutableStateOf("") }
    var pinInput by remember { mutableStateOf("") }
    var childNameInput by remember { mutableStateOf("") }
    var parentNameInput by remember { mutableStateOf("Orang Tua") }
    var selectedDeviceType by remember { mutableStateOf("Smartphone") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Header
        LitensiHeaderGradient(
            title = "Hubungkan Perangkat",
            subtitle = "Pindai QR atau Masukkan Kode dari Litensi Parent",
            showBadge = false
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Two Pairing Options Tab Switcher
            TabRow(
                selectedTabIndex = selectedTabIndex,
                containerColor = Color.White,
                contentColor = IndigoPrimary,
                indicator = { tabPositions ->
                    TabRowDefaults.SecondaryIndicator(
                        Modifier.tabIndicatorOffset(tabPositions[selectedTabIndex]),
                        color = IndigoPrimary
                    )
                },
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .padding(4.dp)
            ) {
                Tab(
                    selected = selectedTabIndex == 0,
                    onClick = { selectedTabIndex = 0 },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.QrCodeScanner,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("1. QR Code", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    },
                    modifier = Modifier.testTag("tab_qr_code")
                )

                Tab(
                    selected = selectedTabIndex == 1,
                    onClick = { selectedTabIndex = 1 },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Key,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("2. Kode Manual", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    },
                    modifier = Modifier.testTag("tab_manual_code")
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Tab 1: QR Scanner Simulator Frame
            if (selectedTabIndex == 0) {
                QrScannerFrame(
                    onSimulateScanSuccess = { rawPayload ->
                        // Parse payload QR JSON shape: {t:litensi-pair, v:1, c:"code", p:"pin", ...}
                        try {
                            val regexCode = """"c"\s*:\s*"([^"]+)"""".toRegex()
                            val regexPin = """"p"\s*:\s*"([^"]+)"""".toRegex()
                            val codeMatch = regexCode.find(rawPayload)?.groupValues?.get(1)
                            val pinMatch = regexPin.find(rawPayload)?.groupValues?.get(1)
                            if (!codeMatch.isNullOrBlank()) {
                                manualCodeInput = codeMatch.uppercase()
                            }
                            if (!pinMatch.isNullOrBlank()) {
                                pinInput = pinMatch
                            }
                        } catch (_: Exception) {
                            // Fallback jika parsing gagal: kosongkan
                        }
                        // (SIMPLIFIED) Setelah parsing QR sukses → user tinggal isi nama (jika mau) → klik button Hubungkan.
                        // TIDAK ADA modal perantara!
                    }
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Field Nama Panggilan Anak (SEBELUM button Hubungkan, baru di Tab QR)
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "Lengkapi Identitas Anak",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF0F172A)
                            )
                        )
                        Text(
                            text = "Isi nama panggilan untuk mempermudah identitas perangkat di dashboard Orang Tua",
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = Color(0xFF64748B),
                                textAlign = TextAlign.Center
                            ),
                            modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
                        )
                        OutlinedTextField(
                            value = childNameInput,
                            onValueChange = { childNameInput = it.take(50) },
                            label = { Text("Nama Panggilan Anak") },
                            placeholder = { Text("Contoh: Nadia, Adek, Kakak") },
                            singleLine = true,
                            shape = RoundedCornerShape(16.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = IndigoPrimary,
                                unfocusedBorderColor = Color(0xFFCBD5E1)
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("input_child_nickname")
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        // Button Hubungkan Perangkat (QR Tab Version)
                        val btnEnabledQr = !isPairingLoading
                            && manualCodeInput.isNotBlank()
                            && pinInput.length >= 4
                        Button(
                            onClick = {
                                onConnectSuccess(
                                    manualCodeInput,
                                    pinInput,
                                    parentNameInput.takeIf { it.isNotBlank() } ?: "Orang Tua",
                                    childNameInput.takeIf { it.isNotBlank() } ?: "Anak"
                                )
                            },
                            enabled = btnEnabledQr,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(38.dp)
                                .testTag("btn_connect_qr_code"),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = IndigoPrimary,
                                contentColor = Color.White,
                                disabledContainerColor = IndigoPrimary.copy(alpha = 0.4f),
                                disabledContentColor = Color.White.copy(alpha = 0.7f)
                            )
                        ) {
                            if (isPairingLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(18.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    text = "Sedang Hubungkan...",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp
                                )
                            } else {
                                Text(
                                    text = "Hubungkan Perangkat Sekarang",
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp
                                    )
                                )
                            }
                        }
                    }
                }
            } else {
                // Tab 2: Manual Kode + PIN Pairing
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "Masukkan Kode Pairing dan PIN",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF0F172A)
                            )
                        )

                        Text(
                            text = "Dapatkan kode + PIN dari aplikasi Litensi Parent di HP Orang Tua",
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = Color(0xFF64748B),
                                textAlign = TextAlign.Center
                            ),
                            modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
                        )

                        OutlinedTextField(
                            value = manualCodeInput,
                            onValueChange = { manualCodeInput = it.uppercase() },
                            label = { Text("Kode Pairing") },
                            placeholder = { Text("Contoh: LTN-NAD-8842-SEC") },
                            singleLine = true,
                            shape = RoundedCornerShape(16.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = IndigoPrimary,
                                unfocusedBorderColor = Color(0xFFCBD5E1)
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("input_pairing_code")
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        OutlinedTextField(
                            value = pinInput,
                            onValueChange = { pinInput = it.filter { ch -> ch.isDigit() }.take(10) },
                            label = { Text("PIN Pairing (6 Digit)") },
                            placeholder = { Text("Contoh: 884291") },
                            singleLine = true,
                            visualTransformation = PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                            shape = RoundedCornerShape(16.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = IndigoPrimary,
                                unfocusedBorderColor = Color(0xFFCBD5E1)
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("input_pairing_pin")
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        // Field Nama Panggilan Anak (Tab 2 Manual)
                        Text(
                            text = "Lengkapi Identitas Anak",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF0F172A)
                            ),
                            modifier = Modifier.padding(top = 4.dp)
                        )
                        Text(
                            text = "Isi nama panggilan untuk mempermudah identitas perangkat di dashboard Orang Tua",
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = Color(0xFF64748B),
                                textAlign = TextAlign.Center
                            ),
                            modifier = Modifier.padding(top = 4.dp, bottom = 12.dp)
                        )
                        OutlinedTextField(
                            value = childNameInput,
                            onValueChange = { childNameInput = it.take(50) },
                            label = { Text("Nama Panggilan Anak") },
                            placeholder = { Text("Contoh: Nadia, Adek, Kakak") },
                            singleLine = true,
                            shape = RoundedCornerShape(16.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = IndigoPrimary,
                                unfocusedBorderColor = Color(0xFFCBD5E1)
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("input_child_nickname")
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        val btnEnabled = !isPairingLoading
                            && manualCodeInput.isNotBlank()
                            && pinInput.length >= 4
                        Button(
                            onClick = {
                                onConnectSuccess(
                                    manualCodeInput,
                                    pinInput,
                                    parentNameInput.takeIf { it.isNotBlank() } ?: "Orang Tua",
                                    childNameInput.takeIf { it.isNotBlank() } ?: "Anak"
                                )
                            },
                            enabled = btnEnabled,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(38.dp)
                                .testTag("btn_connect_manual_code"),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = IndigoPrimary,
                                contentColor = Color.White,
                                disabledContainerColor = IndigoPrimary.copy(alpha = 0.4f),
                                disabledContentColor = Color.White.copy(alpha = 0.7f)
                            )
                        ) {
                            if (isPairingLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(18.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    text = "Sedang Hubungkan...",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp
                                )
                            } else {
                                Text(
                                    text = "Hubungkan Perangkat Sekarang",
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp
                                    )
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
