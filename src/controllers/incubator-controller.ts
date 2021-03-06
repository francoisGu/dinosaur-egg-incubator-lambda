import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../shared/api-interfaces';
import { ResponseBuilder } from '../shared/response-builder';
import { IncubatorRepo } from '../repository/incubator-repo';
import { ApiResult, ApiInput } from '../interfaces/api';
import * as config from '../constant/config';
import * as errors from '../constant/errors';

export class IncubatorController {
    /**
     * @constructor for IncubatorController
     * @param incubatorRepo domain logic for incubator
     */
    public constructor(
        public incubatorRepo: IncubatorRepo = new IncubatorRepo(),
    ) { }

    /**
     * Controller function for putSettings
     * @param event aws api gateway event, body should be JSON formate.
     *  Body formate should be stringified of @see ApiInput
     * @param callback aws api gateway callback function to return result
     */
    public putSettings: ApiHandler = async (
        event: ApiEvent, _: ApiContext, callback: ApiCallback,
    ): Promise<void> => {
        const {
            number_of_eggs,
            sequence: sequenceString,
            rotation_amount,
        } = JSON.parse(event.body) as ApiInput;
        const eggAmount = +number_of_eggs;
        const sequence = sequenceString.split(/\s+/).map(s => +s);
        const validSequence = sequence.filter(seq => Number.isInteger(seq));
        const rotationAmount = +rotation_amount;

        // validate the input.number_of_eggs
        if (!Number.isInteger(eggAmount)
            || eggAmount < config.MIN_EGG_AMOUNT
            || eggAmount > config.MAX_EGG_AMOUNT) {
            console.error(errors.ERROR_MESSAGE.InvalidEggNumber);
            ResponseBuilder.badRequest(
                errors.ERROR_CODE.InvalidEggNumber,
                errors.ERROR_MESSAGE.InvalidEggNumber,
                callback,
            );
            return undefined;
        }

        // validate the input.sequence
        if (sequence.length !== validSequence.length) {
            console.error(errors.ERROR_MESSAGE.InvalidSequence);
            ResponseBuilder.badRequest(
                errors.ERROR_CODE.InvalidSequence,
                errors.ERROR_MESSAGE.InvalidSequence,
                callback,
            );
            return undefined;
        }

        // validate the input.rotation_amount
        if (!rotationAmount
            || rotationAmount < config.MIN_ROTATION_AMOUNT
            || rotationAmount > config.MAX_ROTATION_AMOUNT) {
            console.error(errors.ERROR_MESSAGE.InvalidRotationAmount);
            ResponseBuilder.badRequest(
                errors.ERROR_CODE.InvalidRotationAmount,
                errors.ERROR_MESSAGE.InvalidRotationAmount,
                callback,
            );
            return undefined;
        }

        const incubator = await this.incubatorRepo.createIncubator(
            eggAmount, validSequence, rotationAmount);

        const apiResult = {
            report: {
                number_of_eggs: incubator.eggs.length,
                sequence: incubator.sequence.join(' '),
                rotation_amount: incubator.rotation,
                rotations: incubator.eggs.map(egg => ({
                    egg: egg.id,
                    was_rotated: egg.rotated,
                })),
            },
        } as ApiResult;

        ResponseBuilder.ok<ApiResult>(apiResult, callback);
    }

    /**
     * Controller function for portRun
     * @param callback aws api gateway callback function to return result
     */
    public portRun: ApiHandler = async (
        _: ApiEvent, __: ApiContext, callback: ApiCallback,
    ): Promise<void> => {
        const incubator = await this.incubatorRepo.rotateEggs();

        if (!incubator) {
            ResponseBuilder.badRequest(
                errors.ERROR_CODE.IncubatorNotExist,
                errors.ERROR_MESSAGE.IncubatorNotExist,
                callback,
            );
            return undefined;
        }

        const apiResult = {
            report: {
                number_of_eggs: incubator.eggs.length,
                sequence: incubator.sequence.join(' '),
                rotation_amount: incubator.rotation,
                rotations: incubator.eggs.map(egg => ({
                    egg: egg.id,
                    was_rotated: egg.rotated,
                })),
            },
        } as ApiResult;

        ResponseBuilder.ok<ApiResult>(apiResult, callback);
    }
}
