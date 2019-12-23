import Joi from 'joi';
import { laptop, laptop_block } from 'models';
import {
    INVALID_REQUEST_BODY_FORMAT, INVALID_APPLY_TIME, RESERVED_SEAT, RESERVED_USER, INVALID_SEAT, BORROW_BLOCKED, NOT_BROUGHT, INVALID_REQUEST_DATA
} from 'errors/error'

const ROOM_LIST = ["lab1", "lab2", "lab3", "lab4", "self"];
const ROOM_NAME = ["Lab 1실", "Lab 2실", "Lab 3실", "Lab 4실", "자기주도학습실"];
const ROOM_SIZE = [24, 24, 24, 24, 36];

export const BorrowLaptop = async (ctx) => {
    //Joi 형식 검사
    const bodyFormat = Joi.object().keys({
        room : Joi.string().required(),
        seat : Joi.number().required()
    });

    const result = Joi.validate(ctx.request.body, bodyFormat)

    if (result.error) {
        throw INVALID_REQUEST_BODY_FORMAT;
    }
    
    //대여 가능한 시간인지 확인
    const currentTime = new Date();
    const currentDay = currentTime.getDay();
    const currentHour = currentTime.getHours();

    if (currentDay >= 5 || currentDay == 0) {
        throw INVALID_APPLY_TIME;
    }

    if (currentHour < 9 || currentHour >= 21) {
        throw INVALID_APPLY_TIME;
    }

    //노트북 대여 금지된 유저인지 확인
    const isBlocked = await laptop_block.findOne({
        where: {
            user_id : ctx.user.user_id
        }
    });

    const today = new Date().toISOString().slice(0, 10);

    if (isBlocked && (isBlocked.starts_at <= today && isBlocked.ends_at >= today)) {
        throw BORROW_BLOCKED;
    }
    
    //이미 대여한 유저인지 확인
    const mySeat = await laptop.findOne({
        where: {
            user_id : ctx.user.user_id,
            created_at: today
        }
    })
    
    if (mySeat) {
        throw RESERVED_USER;
    }

    //대여된 자리인지 확인
    const seat = await laptop.findOne({
        where: {
            seat: ctx.request.body.seat,
            created_at: today
        }
    })

    if (seat) {
        throw RESERVED_SEAT;
    }

    //대여 가능한 실인지 확인
    if (!ROOM_LIST.includes(ctx.request.body.room)) {
        throw INVALID_REQUEST_DATA;
    }

    //대여 가능한 자리인지 확인


    //노트북 대여
    await laptop.create({
        "user_id" : ctx.user.user_id,
        "room" : ctx.request.body.room,
        "seat" : ctx.request.body.seat 
    })
    
    ctx.status = 200;
}

export const ChangeLaptop = async (ctx) => {
    //Joi 형식 검사
    const bodyFormat = Joi.object().keys({
        room: Joi.string().required(),
        seat: Joi.number().required()
    });

    const result = Joi.validate(ctx.request.body, bodyFormat)

    if (result.error) {
        throw INVALID_REQUEST_BODY_FORMAT;
    }
    
    //대여한 유저인지 확인
    const today = new Date().toISOString().slice(0, 10);

    const mySeat = await laptop.findOne({
        where: {
            user_id: ctx.user.user_id,
            created_at: today
        }
    })

    if (mySeat == null) {
        throw NOT_BROUGHT;
    }

    //대여 가능한 시간인지 확인
    const currentTime = new Date();
    const currentDay = currentTime.getDay();
    const currentHour = currentTime.getHours();

    if (currentDay >= 5 || currentDay == 0) {
        throw INVALID_APPLY_TIME;
    }
    
    if (currentHour < 9 || currentHour >= 21) {
        throw INVALID_APPLY_TIME;
    }

    //대여된 자리인지 확인
    const seat = await laptop.findOne({
        where: {
            seat: ctx.request.body.seat,
            created_at: today
        }
    })

    if (seat) {
        throw RESERVED_SEAT;
    }

    //대여 가능한 실인지 확인
    if (!ROOM_LIST.includes(ctx.request.body.room)) {
        throw INVALID_REQUEST_DATA;
    }

    //대여 가능한 자리인지 확인


    //대여 자리 변경
    await mySeat.update({
        "room" : ctx.request.body.room,
        "seat" : ctx.request.body.seat
    })

    ctx.status = 200
}

export const CancelLaptop = async (ctx) => {
    //대여한 유저인지 확인
    const today = new Date().toISOString().slice(0, 10);

    const seat = await laptop.findOne({
        where: {
            user_id : ctx.user.user_id,
            created_at : today
        }
    })

    if (seat == null) {
        throw NOT_BROUGHT;
    }

    await seat.destroy();
    ctx.status = 200;
}

export const MyLaptop = async (ctx) => {
    //대여한 유저인지 확인
    const today = new Date().toISOString().slice(0, 10);

    const mySeat = await laptop.findOne({
        where: {
            user_id: ctx.user.user_id,
            created_at: today
        }
    })

    var room;
    var seat;

    if (mySeat == null) {
        room = "";
        seat = 0;
    }
    else {
        room = mySeat.room,
        seat = mySeat.seat
    }

    ctx.status = 200;
    ctx.body = {
        "room" : room,
        "seat" : seat
    }
}

export const RoomList = async (ctx) => {
    let rooms = {};

    const today = new Date().toISOString().slice(0, 10);

    for (let i in ROOM_LIST) {
        const room = await laptop.findAll({
            where: {
                room: ROOM_LIST[i],
                created_at: today
            }
        })
        
        const statusRatio = room.length / ROOM_SIZE[i];
        let status;

        if (statusRatio <= 0.5) 
            status = 0;
        else if (statusRatio <= 0.75) 
            status = 1;
        else
            status = 2;

        rooms[ROOM_NAME[i]] = {
            "room" : ROOM_LIST[i],
            "size" : ROOM_SIZE[i],
            "seats" : room.length,
            "status" : status
        }
    }

    ctx.status = 200;
    ctx.body = rooms;
}

export const RoomSeat = async (ctx) => {
    //올바른 학습실인지 확인
    const room = ctx.params.room;
    
    if (!ROOM_LIST.includes(room)){
        throw INVALID_REQUEST_DATA
    }
    
    //오늘 해당 학습실에서 대여된 자리 조회
    const today = new Date().toISOString().slice(0, 10);

    const seats = await laptop.findAll({
        where: {
            room: room,
            created_at: today
        }
    })

    let seatsArray = [];

    for (let i in seats){
        seatsArray.push(seats[i].seat)
    }

    ctx.status = 200;
    ctx.body = {
        "seats" : seatsArray
    }
}