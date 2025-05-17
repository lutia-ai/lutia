<script lang="ts">
	import { roundToTwoSignificantDigits } from '$lib/models/cost-calculators/tokenCounter';

    export let inputCost: number;
    export let outputCost: number;

</script>
<div class="price-open-container">
    <div class="price-record">
        <p>Input:</p>
        <span
            >${roundToTwoSignificantDigits(
                inputCost
            )}</span
        >
    </div>
    <div class="price-record">
        <p>Output:</p>
        <span
            >${roundToTwoSignificantDigits(
                outputCost
            )}</span
        >
    </div>
    <div class="price-record">
        <p>Total:</p>
        <span
            >${roundToTwoSignificantDigits(
                inputCost +
                    outputCost
            )}</span
        >
    </div>
</div>

<style lang="scss">
    .price-open-container {
        position: absolute;
        display: flex;
        gap: 15px;
        flex-direction: column;
        bottom: 40px;
        left: -10px;
        background: var(--bg-color-light);
        padding: 10px;
        border-radius: 10px;
        border: 1px solid var(--text-color-light-opacity);
        width: max-content;

        .price-record {
            position: relative;
            display: flex;
            gap: 5px;

            p {
                position: relative;
                margin: 0;
                transition: none;
                opacity: 1;
                font-size: 14px;
                width: 50px;
                padding: 0;
                left: 0;
                top: 0;
                transform: translateX(0);
            }

            span {
                position: relative;
                margin: 0;
                width: max-content;
            }
        }
    }
</style>