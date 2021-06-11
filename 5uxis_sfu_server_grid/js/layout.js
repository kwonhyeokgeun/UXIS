$(function(){
	$(".chat_up").css('display', 'none');
	$(".chat_down").css('display', 'block');
	$(".chat_wrap").css('display', 'block');
		
	$('.chat_down').click(function(event) {
		$(".chat_down").css('display', 'none');
		$('.chat_up').fadeIn();	
		$('.chat_wrap').fadeOut();
		
	});
	
	$('.chat_up').click(function(event) {
		$('.chat_up').fadeOut();
		$('.chat_wrap').fadeIn();
		$(".chat_down").css('display', 'block');
	});		
	

	$(".list_show").css('display', 'none');
	$(".list_hide").css('display', 'block');
	$(".partc_list_wrap").css('display', 'block');
		
	$('.list_hide').click(function(event) {
		$(".list_hide").css('display', 'none');
		$('.list_show').fadeIn();	
		$('.partc_list_wrap').fadeOut();
		
	});
	
	$('.list_show').click(function(event) {
		$('.list_show').fadeOut();
		$('.partc_list_wrap').fadeIn();
		$(".list_hide").css('display', 'block');
	});
		
	
	
});

