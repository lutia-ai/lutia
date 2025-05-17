<script lang="ts">
	import { roundToTwoSignificantDigits } from '$lib/models/cost-calculators/tokenCounter';
    import { PaymentTier } from '@prisma/client';
    
    // Props
    export let tokens: number = 0;
    export let cost: number = 0;
    export let contextWindowSize: number = 0;
    export let isVisible: boolean = true;
    export let paymentTier: PaymentTier = PaymentTier.PayAsYouGo;
    
    // Reactive
    $: showCost = paymentTier === PaymentTier.PayAsYouGo;
</script>

{#if isVisible}
    <div class="input-token-container">
        <p>Context window: {contextWindowSize}</p>
        {#if showCost}
            <p class="middle">
                ~ Input cost: {cost === -1
                    ? '?'
                    : '$' + roundToTwoSignificantDigits(cost)}
            </p>
        {/if}
        <p class="right">
            ~ Input tokens: {tokens === -1 ? '?' : tokens}
        </p>
    </div>
{/if}

<style lang="scss">
    .input-token-container {
        position: absolute;
        top: 100%;
        display: flex;
        width: 100%;
        // padding: 10px 50px 10px 50px;
        padding: 10px 2vw 10px 2vw;
        box-sizing: border-box;

        p {
            text-align: left;
            width: 100%;
            color: var(--text-color-light);
            margin: 0;
            font-size: 12px;
            font-family:
                ui-sans-serif,
                -apple-system,
                system-ui,
                Segoe UI,
                Helvetica,
                Apple Color Emoji,
                Arial,
                sans-serif,
                Segoe UI Emoji,
                Segoe UI Symbol;
        }

        .middle {
            text-align: center;
        }

        .right {
            text-align: right;
        }
    }

    @media (max-width: 810px) {
        .input-token-container {
            padding: 10px 15px !important;
        }
    }
</style> 