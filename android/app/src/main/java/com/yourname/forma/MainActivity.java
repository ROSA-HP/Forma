package com.yourname.forma;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import java.util.Locale;

/**
 * Seamless launch: the native splash (logo on black, see res/drawable/splash_icon.xml)
 * stays up until the WebView has painted the identical static splash from index.html,
 * aligned to the same screen centre. Then the native splash is removed instantly —
 * nothing visibly changes — and the web animation starts from that exact frame.
 */
public class MainActivity extends BridgeActivity {

    /** Upper bound so a slow or failed page load can never trap the user on the splash. */
    private static final long MAX_NATIVE_SPLASH_MS = 3000;

    private volatile boolean keepNativeSplash = true;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);

        splashScreen.setKeepOnScreenCondition(() -> keepNativeSplash);
        splashScreen.setOnExitAnimationListener(provider -> {
            // No exit animation: the web splash underneath is the same image in the same place
            provider.remove();
            runSplashJs("window.formaSplashPlay && window.formaSplashPlay()");
        });

        if (bridge != null) {
            bridge.addWebViewListener(new WebViewListener() {
                @Override
                public void onPageLoaded(WebView webView) {
                    alignWebSplashThenRelease(webView);
                }
            });
        }
        mainHandler.postDelayed(this::releaseNativeSplash, MAX_NATIVE_SPLASH_MS);
    }

    /**
     * The native splash icon is centred on the whole window. The WebView may be inset by
     * the status / navigation bars (Android 12–14 without edge-to-edge), so tell the page
     * how far the window centre is from its own centre, in CSS px (= dp).
     */
    private void alignWebSplashThenRelease(WebView webView) {
        if (!keepNativeSplash) return;
        View decor = getWindow().getDecorView();
        float density = getResources().getDisplayMetrics().density;
        float dx = 0f;
        float dy = 0f;
        if (webView.getWidth() > 0 && webView.getHeight() > 0 && decor.getHeight() > 0) {
            int[] webLoc = new int[2];
            int[] decorLoc = new int[2];
            webView.getLocationOnScreen(webLoc);
            decor.getLocationOnScreen(decorLoc);
            dx = ((decorLoc[0] + decor.getWidth() / 2f) - (webLoc[0] + webView.getWidth() / 2f)) / density;
            dy = ((decorLoc[1] + decor.getHeight() / 2f) - (webLoc[1] + webView.getHeight() / 2f)) / density;
        }
        String js = String.format(Locale.US, "window.formaSplashAlign && window.formaSplashAlign(%.2f, %.2f)", dx, dy);
        webView.evaluateJavascript(js, result ->
            // Release only once that aligned frame is ready to be drawn
            webView.postVisualStateCallback(0, new WebView.VisualStateCallback() {
                @Override
                public void onComplete(long requestId) {
                    releaseNativeSplash();
                }
            })
        );
        // Safety net in case the visual-state callback is delayed while drawing is held
        mainHandler.postDelayed(this::releaseNativeSplash, 500);
    }

    private void releaseNativeSplash() {
        keepNativeSplash = false;
    }

    private void runSplashJs(String js) {
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().evaluateJavascript(js, null);
        }
    }
}
