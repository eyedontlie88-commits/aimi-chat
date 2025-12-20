package com.aimi.chat;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth; // Thêm dòng này

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Đăng ký plugin Google Auth Native
        registerPlugin(GoogleAuth.class);
    }
}
