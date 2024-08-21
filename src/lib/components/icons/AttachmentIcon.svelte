<script lang="ts">
	export let color: string;
    export let strokeWidth: number = 1;
</script>
<!-- 
<svg width="100%" height="100%" viewBox="-8 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g id="Page-1" stroke="none" stroke-width={strokeWidth} fill="none" fill-rule="evenodd">
        <g id="Icon-Set" transform="translate(-212.000000, -151.000000)" fill={color}>
            <path d="M226,155 L226,175 C226,178.313 223.313,181 220,181 C216.687,181 214,178.313 214,175 L214,157 C214,154.791 215.791,153 218,153 C220.209,153 222,154.791 222,157 L222,175 C222,176.104 221.104,177 220,177 C218.896,177 218,176.104 218,175 L218,159 L216,159 L216,175 C216,177.209 217.791,179 220,179 C222.209,179 224,177.209 224,175 L224,157 C224,153.687 221.313,151 218,151 C214.687,151 212,153.687 212,157 L212,176 C212.493,179.945 215.921,183 220,183 C224.079,183 227.507,179.945 228,176 L228,155 L226,155" id="attachment">

            </path>
        </g>
    </g>
</svg> -->

<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M17.5 5.25581V16.5C17.5 19.5376 15.0376 22 12 22C8.96243 22 6.5 19.5376 6.5 16.5V5.66667C6.5 3.64162 8.14162 2 10.1667 2C12.1917 2 13.8333 3.64162 13.8333 5.66667V16.4457C13.8333 17.4583 13.0125 18.2791 12 18.2791C10.9875 18.2791 10.1667 17.4583 10.1667 16.4457V6.65116" stroke={color} stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round"/>
</svg>

<style lang="scss">
	svg {
		display: flex;
		margin: auto 0;
		width: 100%;
		height: 100%;
	}
</style>



