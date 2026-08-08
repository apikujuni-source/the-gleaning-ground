(function(){
  "use strict";

  function showQueryNotice(){
    var params = new URLSearchParams(window.location.search);
    var notice = document.querySelector("[data-store-notice]");
    if(!notice) return;
    if(params.get("checkout") === "cancelled"){
      notice.hidden = false;
      notice.textContent = "Your checkout was cancelled. No charge was made.";
    }else if(params.get("setup") === "stripe"){
      notice.hidden = false;
      notice.textContent = "Direct international checkout is being activated. Please use Amazon or contact info@gleaningground.com.";
    }else if(params.get("setup") === "paystack"){
      notice.hidden = false;
      notice.textContent = "Nigeria checkout is being activated. Please use WhatsApp or contact info@gleaningground.com.";
    }else if(params.get("error")){
      notice.hidden = false;
      notice.textContent = "Checkout could not be opened. Please try again or use the alternative order option.";
    }
  }

  async function verifyPayment(){
    var target = document.querySelector("[data-payment-verification]");
    if(!target) return;
    var params = new URLSearchParams(window.location.search);
    var provider = params.get("provider");
    if(provider === "bulk"){
      target.textContent = "Your church or bulk-order request has been received. We will respond by email.";
      return;
    }

    var endpoint = "";
    if(provider === "stripe" && params.get("session_id")){
      endpoint = "/api/checkout/stripe/verify?session_id=" + encodeURIComponent(params.get("session_id"));
    }else if(provider === "paystack" && (params.get("reference") || params.get("trxref"))){
      endpoint = "/api/checkout/paystack/verify?reference=" + encodeURIComponent(params.get("reference") || params.get("trxref"));
    }else{
      target.textContent = "Check your email for your payment receipt or submission confirmation.";
      return;
    }

    try{
      var response = await fetch(endpoint,{headers:{accept:"application/json"}});
      var data = await response.json();
      if(!response.ok || !data.paid) throw new Error(data.message || "Payment verification is still pending.");
      target.textContent = "Payment verified. Your preorder is confirmed and a receipt has been sent by the payment provider.";
      target.style.background = "#e3f2e8";
      target.style.color = "#176b43";
    }catch(error){
      target.textContent = error.message + " Keep your receipt and contact info@gleaningground.com if this does not update.";
      target.style.background = "#fdeeea";
      target.style.color = "#8d2f24";
    }
  }

  showQueryNotice();
  verifyPayment();
})();
