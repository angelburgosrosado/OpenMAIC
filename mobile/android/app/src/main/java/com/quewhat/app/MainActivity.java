package com.quewhat.app;

import android.app.UiModeManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // The website switches to its 10-foot, remote-friendly layout when the
        // user agent says "TV". Android TV's WebView doesn't always, so add it.
        if (isTelevision() && getBridge() != null && getBridge().getWebView() != null) {
            WebSettings settings = getBridge().getWebView().getSettings();
            String ua = settings.getUserAgentString();
            if (ua != null && !ua.contains("AndroidTV")) {
                settings.setUserAgentString(ua + " AndroidTV");
            }
        }
    }

    private boolean isTelevision() {
        UiModeManager ui = (UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
        if (ui != null && ui.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION) return true;
        PackageManager pm = getPackageManager();
        return pm.hasSystemFeature(PackageManager.FEATURE_LEANBACK)
            || pm.hasSystemFeature("amazon.hardware.fire_tv");
    }
}
